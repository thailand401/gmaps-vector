// UI Component Builders

class UIComponents {
    // Toast notifications
    static showToast(message, type = 'info', duration = 3000) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast active ${type}`;

        setTimeout(() => {
            toast.classList.remove('active');
        }, duration);
    }

    // Modal management
    static openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }

    static closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // Clear form
    static clearForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
        }
    }

    // Create action buttons
    static createActionButtons(editCallback, deleteCallback) {
        const div = document.createElement('div');
        div.className = 'action-buttons';

        const editBtn = document.createElement('button');
        editBtn.className = 'btn-edit';
        editBtn.textContent = '✏️ Edit';
        editBtn.onclick = editCallback;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete';
        deleteBtn.textContent = '🗑️ Delete';
        deleteBtn.onclick = deleteCallback;

        div.appendChild(editBtn);
        div.appendChild(deleteBtn);

        return div;
    }

    // Create priority badge
    static createPriorityBadge(priority) {
        // Convert int to string label
        const priorityMap = {
            0: 'Low',
            1: 'Medium',
            2: 'High',
            3: 'Critical'
        };
        
        // Handle both int and string priority
        const priorityLabel = typeof priority === 'number' ? priorityMap[priority] : priority;
        
        const span = document.createElement('span');
        span.className = `priority-badge priority-${(priorityLabel || 'medium').toLowerCase()}`;
        span.textContent = priorityLabel || 'Medium';
        return span;
    }

    // Convert snake_case/camelCase key to Title Case header label
    static formatHeader(key) {
        return key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
    }

    // Render categories table with dynamic thead derived from API keys
    static renderCategoriesTable(categories) {
        const thead = document.getElementById('categoriesTableHead');
        const tbody = document.getElementById('categoriesTableBody');
        tbody.innerHTML = '';

        if (!categories || categories.length === 0) {
            thead.innerHTML = '';
            tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: var(--text-muted);">No categories found</td></tr>';
            return;
        }

        // Derive columns from first item's keys
        const columns = Object.keys(categories[0]);

        // Render thead
        const headRow = document.createElement('tr');
        [...columns, 'actions'].forEach(col => {
            const th = document.createElement('th');
            th.textContent = UIComponents.formatHeader(col);
            headRow.appendChild(th);
        });
        thead.innerHTML = '';
        thead.appendChild(headRow);

        // Render tbody
        categories.forEach(category => {
            const row = document.createElement('tr');

            columns.forEach(col => {
                const td = document.createElement('td');
                const value = category[col];
                if (value === null || value === undefined) {
                    td.textContent = '—';
                } else if (col === 'created_at') {
                    td.textContent = new Date(value).toLocaleString();
                } else if (col === 'embedding' && typeof value === 'string' && value.length > 50) {
                    td.textContent = value.substring(0, 50) + '…';
                    td.title = value;
                } else {
                    td.textContent = value;
                }
                row.appendChild(td);
            });

            const actionTd = document.createElement('td');
            actionTd.appendChild(
                UIComponents.createActionButtons(
                    () => window.editCategory(category),
                    () => window.deleteCategory(category.id)
                )
            );
            row.appendChild(actionTd);
            tbody.appendChild(row);
        });
    }

    // Render intents table with dynamic thead derived from API keys
    // categoriesMap: { [id]: label } for looking up category names
    static renderIntentsTable(intents, categoriesMap = {}) {
        const thead = document.getElementById('intentsTableHead');
        const tbody = document.getElementById('intentsTableBody');
        tbody.innerHTML = '';

        if (!intents || intents.length === 0) {
            thead.innerHTML = '';
            tbody.innerHTML = '<tr><td colspan="2" style="text-align: center; color: var(--text-muted);">No intents found</td></tr>';
            return;
        }

        // Derive columns from first item, excluding category_label (null, redundant with category_id lookup)
        const excludedCols = new Set(['category_label']);
        const columns = Object.keys(intents[0]).filter(k => !excludedCols.has(k));

        // Render thead
        const headRow = document.createElement('tr');
        [...columns, 'actions'].forEach(col => {
            const th = document.createElement('th');
            th.textContent = UIComponents.formatHeader(col);
            headRow.appendChild(th);
        });
        thead.innerHTML = '';
        thead.appendChild(headRow);

        // Render tbody
        intents.forEach(intent => {
            const row = document.createElement('tr');

            columns.forEach(col => {
                const td = document.createElement('td');
                const value = intent[col];
                if (col === 'priority') {
                    td.appendChild(UIComponents.createPriorityBadge(value));
                } else if (col === 'category_id') {
                    td.textContent = categoriesMap[value] || value;
                } else if (value === null || value === undefined) {
                    td.textContent = '—';
                } else if (col === 'created_at') {
                    td.textContent = new Date(value).toLocaleString();
                } else if (col === 'embedding' && typeof value === 'string' && value.length > 50) {
                    td.textContent = value.substring(0, 50) + '…';
                    td.title = value;
                } else {
                    td.textContent = value;
                }
                row.appendChild(td);
            });

            const actionTd = document.createElement('td');
            actionTd.appendChild(
                UIComponents.createActionButtons(
                    () => window.editIntent(intent),
                    () => window.deleteIntent(intent.id)
                )
            );
            row.appendChild(actionTd);
            tbody.appendChild(row);
        });
    }

    // Populate category dropdown
    static populateCategoryDropdown(categories, selectId = 'intentCategory') {
        const select = document.getElementById(selectId);
        if (!select) return;

        const currentValue = select.value;
        select.innerHTML = '<option value="">Select a category</option>';

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.label;
            select.appendChild(option);
        });

        if (currentValue) {
            select.value = currentValue;
        }
    }

    // Populate filter dropdowns
    static populateFilterDropdowns(categories) {
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            const currentValue = categoryFilter.value;
            categoryFilter.innerHTML = '<option value="">All Categories</option>';

            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.label;
                categoryFilter.appendChild(option);
            });

            if (currentValue) {
                categoryFilter.value = currentValue;
            }
        }
    }

    // Update dashboard stats
    static updateDashboardStats(categories, intents) {
        const criticalCount = intents.filter(i => i.priority === 3 || i.priority === 'Critical').length;
        const els = {
            totalCategories: categories.length,
            totalIntents: intents.length,
            criticalCount,
        };
        Object.entries(els).forEach(([id, val]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        });
    }

    // Update status indicator
    static updateStatus(connected = true) {
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.getElementById('statusText');

        if (connected) {
            statusDot.style.backgroundColor = 'var(--accent-green)';
            statusText.textContent = 'Connected';
            statusText.style.color = 'var(--text-secondary)';
        } else {
            statusDot.style.backgroundColor = 'var(--accent-red)';
            statusText.textContent = 'Disconnected';
            statusText.style.color = 'var(--accent-red)';
        }
    }
}
