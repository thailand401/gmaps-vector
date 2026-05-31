// Global state
let rainControls = null; // { freeze, unfreeze } exposed from initMatrixRain

let appState = {
    categories: [],
    intents: [],
    currentView: 'dashboard',
    editingCategory: null,
    editingIntent: null,
};

let deleteContext = {
    type: null,
    id: null,
    name: null,
};

// Initialize the app
document.addEventListener('DOMContentLoaded', async () => {
    rainControls = initMatrixRain();
    initializeEventListeners();
    await loadAllData();
    switchView('dashboard');
    // Auto-freeze 1s after page finishes loading
    setTimeout(() => rainControls?.freeze(), 500);
});

// Initialize all event listeners
function initializeEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            switchView(view);
        });
    });

    // Search
    document.getElementById('searchInput').addEventListener('input', () => {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        applySearch(searchTerm);
    });

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', loadAllData);

    // Category modal
    document.getElementById('addCategoryBtn').addEventListener('click', showAddCategoryModal);
    document.getElementById('categoryForm').addEventListener('submit', handleCategorySave);

    // Intent modal
    document.getElementById('addIntentBtn').addEventListener('click', showAddIntentModal);
    document.getElementById('intentForm').addEventListener('submit', handleIntentSave);

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.currentTarget.dataset.modal;
            UIComponents.closeModal(modalId);
        });
    });

    document.querySelectorAll('.btn-secondary[data-modal]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.currentTarget.dataset.modal;
            UIComponents.closeModal(modalId);
        });
    });

    // Filter/Sort
    document.getElementById('categoryFilter').addEventListener('change', applyIntentFilters);
    document.getElementById('priorityFilter').addEventListener('change', applyIntentFilters);

    // Delete confirmation
    document.getElementById('confirmDeleteBtn').addEventListener('click', handleConfirmDelete);

    // Dashboard search — Enter shows inline results, Escape collapses
    const dashSearch = document.getElementById('dashboardSearch');
    const searchResults = document.getElementById('searchResults');
    if (dashSearch && searchResults) {
        dashSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const term = dashSearch.value.trim().toLowerCase();
                rainControls?.unfreeze();
                renderDashboardResults(term, searchResults);
            }
            if (e.key === 'Escape') {
                collapseDashboardResults(searchResults);
                dashSearch.value = '';
            }
        });
        dashSearch.addEventListener('input', () => {
            if (dashSearch.value.trim() === '') {
                collapseDashboardResults(searchResults);
            }
        });
    }

    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                UIComponents.closeModal(modal.id);
            }
        });
    });
}

// Build a { [id]: label } map from categories array
function buildCategoriesMap(categories) {
    return Object.fromEntries(categories.map(c => [c.id, c.label]));
}

// Load all data from API
async function loadAllData() {
    try {
        UIComponents.updateStatus(false);
        
        // Check health
        await api.healthCheck();
        
        // Load categories
        appState.categories = await api.getCategories();
        
        // Load intents
        appState.intents = await api.getIntents();
        
        // Update UI
        const categoriesMap = buildCategoriesMap(appState.categories);
        UIComponents.renderCategoriesTable(appState.categories);
        UIComponents.renderIntentsTable(appState.intents, categoriesMap);
        UIComponents.populateCategoryDropdown(appState.categories);
        UIComponents.populateFilterDropdowns(appState.categories);
        UIComponents.updateDashboardStats(appState.categories, appState.intents);
        UIComponents.updateStatus(true);
        
        UIComponents.showToast('Data loaded successfully', 'success');
    } catch (error) {
        console.error('Error loading data:', error);
        UIComponents.updateStatus(false);
        UIComponents.showToast(`Failed to load data: ${error.message}`, 'error');
    }
}

// Switch view
function switchView(viewName) {
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.view === viewName) {
            btn.classList.add('active');
        }
    });

    // Update content
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    const viewElement = document.getElementById(viewName);
    if (viewElement) {
        viewElement.classList.add('active');
    }

    // Update title
    const titles = {
        dashboard: 'Dashboard',
        categories: 'Categories Management',
        intents: 'Intents Management',
    };
    document.getElementById('viewTitle').textContent = titles[viewName] || 'Dashboard';

    appState.currentView = viewName;
}

// Apply search across all views
function applySearch(searchTerm) {
    if (appState.currentView === 'categories') {
        const filtered = appState.categories.filter(cat => 
            cat.id.toString().includes(searchTerm) ||
            cat.label.toLowerCase().includes(searchTerm)
        );
        UIComponents.renderCategoriesTable(filtered);
    } else if (appState.currentView === 'intents') {
        const categoriesMap = buildCategoriesMap(appState.categories);
        const filtered = appState.intents.filter(intent => {
            const catLabel = (intent.category_label || categoriesMap[intent.category_id] || 'unknown').toLowerCase();
            return intent.name.toLowerCase().includes(searchTerm) || catLabel.includes(searchTerm);
        });
        UIComponents.renderIntentsTable(filtered, categoriesMap);
    }
}

// ==================== CATEGORIES ====================

function showAddCategoryModal() {
    appState.editingCategory = null;
    UIComponents.clearForm('categoryForm');
    document.getElementById('categoryModalTitle').textContent = 'Add Category';
    UIComponents.openModal('categoryModal');
}

window.editCategory = function(category) {
    appState.editingCategory = category;
    document.getElementById('categoryLabel').value = category.label;
    document.getElementById('categoryModalTitle').textContent = 'Edit Category';
    UIComponents.openModal('categoryModal');
};

window.deleteCategory = function(categoryId) {
    const category = appState.categories.find(c => c.id === categoryId);
    deleteContext.type = 'category';
    deleteContext.id = categoryId;
    deleteContext.name = category?.label || categoryId;
    document.getElementById('deleteMessage').textContent = `Are you sure you want to delete category "${deleteContext.name}"?`;
    UIComponents.openModal('deleteModal');
};

async function handleCategorySave(e) {
    e.preventDefault();

    const categoryLabel = document.getElementById('categoryLabel').value;

    try {
        if (appState.editingCategory) {
            // Update
            await api.updateCategory(appState.editingCategory.id, {
                label: categoryLabel,
            });
            UIComponents.showToast('Category updated successfully', 'success');
        } else {
            // Create
            await api.createCategory({
                label: categoryLabel,
            });
            UIComponents.showToast('Category created successfully', 'success');
        }

        UIComponents.closeModal('categoryModal');
        await loadAllData();
    } catch (error) {
        UIComponents.showToast(`Error saving category: ${error.message}`, 'error');
    }
}

// ==================== INTENTS ====================

function showAddIntentModal() {
    appState.editingIntent = null;
    UIComponents.clearForm('intentForm');
    document.getElementById('intentModalTitle').textContent = 'Add Intent';
    UIComponents.openModal('intentModal');
}

window.editIntent = function(intent) {
    appState.editingIntent = intent;
    document.getElementById('intentName').value = intent.name;
    document.getElementById('intentCategory').value = intent.category_id;
    
    // Convert int priority to string label
    const priorityMap = {
        0: 'Low',
        1: 'Medium',
        2: 'High',
        3: 'Critical'
    };
    const priorityLabel = typeof intent.priority === 'number' ? priorityMap[intent.priority] : intent.priority;
    document.getElementById('intentPriority').value = priorityLabel || 'Medium';
    
    document.getElementById('intentModalTitle').textContent = 'Edit Intent';
    UIComponents.openModal('intentModal');
};

window.deleteIntent = function(intentId) {
    const intent = appState.intents.find(i => i.id === intentId);
    deleteContext.type = 'intent';
    deleteContext.id = intentId;
    deleteContext.name = intent?.name || intentId;
    document.getElementById('deleteMessage').textContent = `Are you sure you want to delete intent "${deleteContext.name}"?`;
    UIComponents.openModal('deleteModal');
};

async function handleIntentSave(e) {
    e.preventDefault();

    const intentName = document.getElementById('intentName').value;
    const categoryId = parseInt(document.getElementById('intentCategory').value);
    const priorityLabel = document.getElementById('intentPriority').value;
    
    // Convert string priority label to int
    const priorityIntMap = {
        'Low': 0,
        'Medium': 1,
        'High': 2,
        'Critical': 3
    };
    const priority = priorityIntMap[priorityLabel] || 1;

    if (!categoryId) {
        UIComponents.showToast('Please select a category', 'error');
        return;
    }

    try {
        if (appState.editingIntent) {
            // Update
            await api.updateIntent(appState.editingIntent.id, {
                name: intentName,
                category_id: categoryId,
                priority: priority,
            });
            UIComponents.showToast('Intent updated successfully', 'success');
        } else {
            // Create
            await api.createIntent({
                name: intentName,
                category_id: categoryId,
                priority: priority,
            });
            UIComponents.showToast('Intent created successfully', 'success');
        }

        UIComponents.closeModal('intentModal');
        await loadAllData();
    } catch (error) {
        UIComponents.showToast(`Error saving intent: ${error.message}`, 'error');
    }
}

// Apply filters to intents view
function applyIntentFilters() {
    const categoryId = parseInt(document.getElementById('categoryFilter').value);
    const priority = document.getElementById('priorityFilter').value;

    let filtered = appState.intents;

    if (categoryId && !isNaN(categoryId)) {
        filtered = filtered.filter(i => i.category_id === categoryId);
    }

    if (priority) {
        // priority filter value is string label; compare against int stored in data
        const priorityIntMap = { 'Low': 0, 'Medium': 1, 'High': 2, 'Critical': 3 };
        const priorityInt = priorityIntMap[priority];
        filtered = filtered.filter(i =>
            i.priority === priorityInt || i.priority === priority
        );
    }

    const categoriesMap = buildCategoriesMap(appState.categories);
    UIComponents.renderIntentsTable(filtered, categoriesMap);
}

// ==================== DELETE CONFIRMATION ====================

async function handleConfirmDelete() {
    try {
        if (deleteContext.type === 'category') {
            await api.deleteCategory(deleteContext.id);
            UIComponents.showToast('Category deleted successfully', 'success');
        } else if (deleteContext.type === 'intent') {
            await api.deleteIntent(deleteContext.id);
            UIComponents.showToast('Intent deleted successfully', 'success');
        }

        UIComponents.closeModal('deleteModal');
        await loadAllData();
    } catch (error) {
        UIComponents.showToast(`Error deleting item: ${error.message}`, 'error');
    }
}

// ==================== DASHBOARD SEARCH RESULTS ====================
function renderDashboardResults(term, container) {
    container.innerHTML = '';

    const priorityMap = { 0: 'Low', 1: 'Medium', 2: 'High', 3: 'Critical' };
    const categoriesMap = buildCategoriesMap(appState.categories);

    const matchedIntents = term
        ? appState.intents.filter(i =>
            i.name.toLowerCase().includes(term) ||
            (categoriesMap[i.category_id] || '').toLowerCase().includes(term)
          )
        : appState.intents;

    if (matchedIntents.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'search-result-empty';
        empty.textContent = '> no results found_';
        container.appendChild(empty);
    } else {
        matchedIntents.forEach(intent => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.innerHTML = `
                <span class="result-name">${intent.name}</span>
                <span class="result-meta">${categoriesMap[intent.category_id] || '—'} · ${priorityMap[intent.priority] ?? intent.priority}</span>
            `;
            item.addEventListener('click', () => {
                collapseDashboardResults(container);
                document.getElementById('dashboardSearch').value = '';
                switchView('intents');
                document.getElementById('searchInput').value = intent.name;
                applySearch(intent.name.toLowerCase());
            });
            container.appendChild(item);
        });
    }

    container.classList.add('expanded');
}

function collapseDashboardResults(container) {
    container.classList.remove('expanded');
    setTimeout(() => { container.innerHTML = ''; }, 450);
}

// ==================== MATRIX RAIN ====================
function initMatrixRain() {
    const canvas = document.getElementById('matrixCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Katakana + Latin + digits + symbols — matching the screenshot aesthetic
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンヴァィゥェォ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ<>[]{}|=+-*/\\^~#@$%&';
    const fontSize = 12;
    const frameInterval = 80; // ms between frames — tăng để chậm hơn, giảm để nhanh hơn
    let rafId = null;
    let drops = [];
    let lastTime = 0;
    let frozen = false;

    // --- Hold to freeze: Space / click/touch on canvas ---
    function freeze() { frozen = true; }
    function unfreeze() { frozen = false; }


    // Mouse / touch hold on canvas
    canvas.addEventListener('mousedown', freeze);
    canvas.addEventListener('mouseup', unfreeze);
    canvas.addEventListener('mouseleave', unfreeze);
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); freeze(); }, { passive: false });
    canvas.addEventListener('touchend', unfreeze);

    // Space bar hold anywhere on the page (only when dashboard is visible)
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !e.repeat && document.getElementById('dashboard')?.classList.contains('active')) {
            e.preventDefault();
            freeze();
        }
    });
    document.addEventListener('keyup', (e) => {
        if (e.code === 'Space') unfreeze();
    });

    function resize() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        const cols = Math.floor(canvas.width / fontSize);
        // Preserve existing drops, initialise new columns randomly mid-screen
        drops = Array.from({ length: cols }, (_, i) =>
            drops[i] !== undefined ? drops[i] : Math.floor(Math.random() * canvas.height / fontSize)
        );
    }

    function draw(timestamp) {
        if (timestamp - lastTime < frameInterval) {
            rafId = requestAnimationFrame(draw);
            return;
        }
        lastTime = timestamp;

        // Skip rendering when frozen, but keep the loop alive
        if (frozen) {
            rafId = requestAnimationFrame(draw);
            return;
        }

        // Fade trail — low-alpha black overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = `${fontSize}px monospace`;

        for (let i = 0; i < drops.length; i++) {
            const char = chars[Math.floor(Math.random() * chars.length)];
            const y = drops[i] * fontSize;

            // Leading character is bright white, trail is green
            if (drops[i] === Math.floor(y / fontSize)) {
                ctx.fillStyle = '#ffffff';
            } else {
                ctx.fillStyle = '#00ff41';
            }

            // Vary brightness for depth
            const brightness = Math.random() > 0.92 ? '#aaffaa' : '#00ff41';
            ctx.fillStyle = brightness;

            ctx.fillText(char, i * fontSize, y);

            // Reset column to top randomly after passing bottom
            if (y > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }

        rafId = requestAnimationFrame(draw);
    }

    // Pause animation when dashboard is not visible
    const observer = new MutationObserver(() => {
        const dashboard = document.getElementById('dashboard');
        const isVisible = dashboard && dashboard.classList.contains('active');
        if (isVisible && !rafId) {
            rafId = requestAnimationFrame(draw);
        } else if (!isVisible && rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    });

    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        observer.observe(dashboard, { attributes: true, attributeFilter: ['class'] });
    }

    window.addEventListener('resize', () => {
        resize();
    });

    resize();
    rafId = requestAnimationFrame(draw);

    return { freeze, unfreeze };
}
