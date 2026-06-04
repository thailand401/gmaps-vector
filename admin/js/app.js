// Global state
let rainControls = null; // { freeze, unfreeze } exposed from initMatrixRain

let appState = {
    categories: [],
    intents: [],
    cities: [],
    districts: [],
    streets: [],
    positions: [],
    currentView: 'dashboard',
    editingCategory: null,
    editingIntent: null,
    editingCity: null,
    editingDistrict: null,
    editingStreet: null,
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

    // Cities / Districts / Streets modals
    document.getElementById('addCityBtn').addEventListener('click', () => showCityModal());
    document.getElementById('cityForm').addEventListener('submit', handleCitySave);
    document.getElementById('addDistrictBtn').addEventListener('click', () => showDistrictModal());
    document.getElementById('districtForm').addEventListener('submit', handleDistrictSave);
    document.getElementById('addStreetBtn').addEventListener('click', () => showStreetModal());
    document.getElementById('streetForm').addEventListener('submit', handleStreetSave);

    // Maps filters
    document.getElementById('districtCityFilter').addEventListener('change', () => {
        const cityId = parseInt(document.getElementById('districtCityFilter').value) || null;
        const filtered = cityId ? appState.districts.filter(d => d.city === cityId) : appState.districts;
        renderDistrictsTable(filtered);
    });
    document.getElementById('streetCityFilter').addEventListener('change', async () => {
        const cityId = parseInt(document.getElementById('streetCityFilter').value) || null;
        // cascade districts filter
        const districtSel = document.getElementById('streetDistrictFilter');
        const districtOpts = cityId ? appState.districts.filter(d => d.city === cityId) : appState.districts;
        districtSel.innerHTML = '<option value="">All Districts</option>';
        districtOpts.forEach(d => {
            const o = document.createElement('option'); o.value = d.id; o.textContent = d.name; districtSel.appendChild(o);
        });
        const filtered = cityId ? appState.streets.filter(s => s.city_id === cityId) : appState.streets;
        renderStreetsTable(filtered);
    });
    document.getElementById('streetDistrictFilter').addEventListener('change', () => {
        const distId = parseInt(document.getElementById('streetDistrictFilter').value) || null;
        const filtered = distId ? appState.streets.filter(s => s.district_id === distId) : appState.streets;
        renderStreetsTable(filtered);
    });
    document.getElementById('positionStreetFilter').addEventListener('change', () => {
        const streetId = parseInt(document.getElementById('positionStreetFilter').value) || null;
        const filtered = streetId ? appState.positions.filter(p => p.street_id === streetId) : appState.positions;
        renderPositionsTable(filtered);
    });

    // Street city→district cascade in modal
    document.getElementById('streetCity').addEventListener('change', () => {
        const cityId = parseInt(document.getElementById('streetCity').value) || null;
        const distSel = document.getElementById('streetDistrict');
        distSel.innerHTML = '<option value="">Select a district</option>';
        const filtered = cityId ? appState.districts.filter(d => d.city === cityId) : appState.districts;
        filtered.forEach(d => {
            const o = document.createElement('option'); o.value = d.id; o.textContent = d.name; distSel.appendChild(o);
        });
    });

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

// Build helper maps
function buildCategoriesMap(categories) {
    return Object.fromEntries(categories.map(c => [c.id, c.label]));
}
function buildNameMap(items) {
    return Object.fromEntries(items.map(i => [i.id, i.name]));
}

// Load all data from API
async function loadAllData() {
    try {
        UIComponents.updateStatus(false);
        await api.healthCheck();

        [appState.categories, appState.intents, appState.cities] = await Promise.all([
            api.getCategories(),
            api.getIntents(),
            api.getCities(),
        ]);
        appState.districts = await api.getDistricts();
        appState.streets   = await api.getStreets();
        appState.positions = await api.getPositions();

        // Intents / Categories
        const categoriesMap = buildCategoriesMap(appState.categories);
        UIComponents.renderCategoriesTable(appState.categories);
        UIComponents.renderIntentsTable(appState.intents, categoriesMap);
        UIComponents.populateCategoryDropdown(appState.categories);
        UIComponents.populateFilterDropdowns(appState.categories);
        UIComponents.updateDashboardStats(appState.categories, appState.intents);

        // Maps tables
        renderCitiesTable(appState.cities);
        renderDistrictsTable(appState.districts);
        renderStreetsTable(appState.streets);
        renderPositionsTable(appState.positions);

        // Populate maps filter dropdowns
        populateMapsDropdowns();

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
        dashboard:  'Dashboard',
        categories: 'Categories Management',
        intents:    'Intents Management',
        cities:     'Cities Management',
        districts:  'Districts Management',
        streets:    'Streets Management',
        positions:  'Positions Management',
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
        } else if (deleteContext.type === 'city') {
            await api.deleteCity(deleteContext.id);
            UIComponents.showToast('City deleted', 'success');
        } else if (deleteContext.type === 'district') {
            await api.deleteDistrict(deleteContext.id);
            UIComponents.showToast('District deleted', 'success');
        } else if (deleteContext.type === 'street') {
            await api.deleteStreet(deleteContext.id);
            UIComponents.showToast('Street deleted', 'success');
        } else if (deleteContext.type === 'position') {
            await api.deletePosition(deleteContext.id);
            UIComponents.showToast('Position deleted', 'success');
        }

        UIComponents.closeModal('deleteModal');
        await loadAllData();
    } catch (error) {
        UIComponents.showToast(`Error deleting item: ${error.message}`, 'error');
    }
}

// ==================== MAPS: RENDER HELPERS ====================

function populateMapsDropdowns() {
    // districtCityFilter
    const dcf = document.getElementById('districtCityFilter');
    const scf = document.getElementById('streetCityFilter');
    const psf = document.getElementById('positionStreetFilter');
    [dcf, scf].forEach(sel => {
        if (!sel) return;
        const cur = sel.value;
        sel.innerHTML = '<option value="">All Cities</option>';
        appState.cities.forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = c.name; sel.appendChild(o); });
        sel.value = cur;
    });
    if (psf) {
        const cur = psf.value;
        psf.innerHTML = '<option value="">All Streets</option>';
        appState.streets.forEach(s => { const o = document.createElement('option'); o.value = s.id; o.textContent = s.name; psf.appendChild(o); });
        psf.value = cur;
    }
    // Modal selects
    ['districtCity', 'streetCity'].forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const cur = sel.value;
        sel.innerHTML = '<option value="">Select a city</option>';
        appState.cities.forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = c.name; sel.appendChild(o); });
        sel.value = cur;
    });
}

function renderCitiesTable(cities) {
    const thead = document.getElementById('citiesTableHead');
    const tbody = document.getElementById('citiesTableBody');
    if (!thead || !tbody) return;
    tbody.innerHTML = '';
    if (!cities || cities.length === 0) {
        thead.innerHTML = '';
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:var(--text-muted)">No cities found</td></tr>';
        return;
    }
    const cols = Object.keys(cities[0]);
    thead.innerHTML = '';
    const hr = document.createElement('tr');
    [...cols, 'actions'].forEach(c => { const th = document.createElement('th'); th.textContent = UIComponents.formatHeader(c); hr.appendChild(th); });
    thead.appendChild(hr);
    cities.forEach(city => {
        const row = document.createElement('tr');
        cols.forEach(col => {
            const td = document.createElement('td');
            const v = city[col];
            td.textContent = (v === null || v === undefined) ? '—' : (col === 'created_at' ? new Date(v).toLocaleString() : v);
            row.appendChild(td);
        });
        const atd = document.createElement('td');
        atd.appendChild(UIComponents.createActionButtons(() => showCityModal(city), () => deleteMapsItem('city', city.id, city.name)));
        row.appendChild(atd);
        tbody.appendChild(row);
    });
}

function renderDistrictsTable(districts) {
    const thead = document.getElementById('districtsTableHead');
    const tbody = document.getElementById('districtsTableBody');
    if (!thead || !tbody) return;
    tbody.innerHTML = '';
    const cityMap = buildNameMap(appState.cities);
    if (!districts || districts.length === 0) {
        thead.innerHTML = '';
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:var(--text-muted)">No districts found</td></tr>';
        return;
    }
    const cols = Object.keys(districts[0]);
    thead.innerHTML = '';
    const hr = document.createElement('tr');
    [...cols, 'actions'].forEach(c => { const th = document.createElement('th'); th.textContent = UIComponents.formatHeader(c); hr.appendChild(th); });
    thead.appendChild(hr);
    districts.forEach(d => {
        const row = document.createElement('tr');
        cols.forEach(col => {
            const td = document.createElement('td');
            const v = d[col];
            if (col === 'city') td.textContent = cityMap[v] || v || '—';
            else if (v === null || v === undefined) td.textContent = '—';
            else if (col === 'created_at') td.textContent = new Date(v).toLocaleString();
            else td.textContent = v;
            row.appendChild(td);
        });
        const atd = document.createElement('td');
        atd.appendChild(UIComponents.createActionButtons(() => showDistrictModal(d), () => deleteMapsItem('district', d.id, d.name)));
        row.appendChild(atd);
        tbody.appendChild(row);
    });
}

function renderStreetsTable(streets) {
    const thead = document.getElementById('streetsTableHead');
    const tbody = document.getElementById('streetsTableBody');
    if (!thead || !tbody) return;
    tbody.innerHTML = '';
    const cityMap = buildNameMap(appState.cities);
    const distMap = buildNameMap(appState.districts);
    if (!streets || streets.length === 0) {
        thead.innerHTML = '';
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:var(--text-muted)">No streets found</td></tr>';
        return;
    }
    const cols = Object.keys(streets[0]);
    thead.innerHTML = '';
    const hr = document.createElement('tr');
    [...cols, 'actions'].forEach(c => { const th = document.createElement('th'); th.textContent = UIComponents.formatHeader(c); hr.appendChild(th); });
    thead.appendChild(hr);
    streets.forEach(s => {
        const row = document.createElement('tr');
        cols.forEach(col => {
            const td = document.createElement('td');
            const v = s[col];
            if (col === 'city_id') td.textContent = cityMap[v] || v || '—';
            else if (col === 'district_id') td.textContent = distMap[v] || v || '—';
            else if (v === null || v === undefined) td.textContent = '—';
            else if (col === 'created_at') td.textContent = new Date(v).toLocaleString();
            else td.textContent = v;
            row.appendChild(td);
        });
        const atd = document.createElement('td');
        atd.appendChild(UIComponents.createActionButtons(() => showStreetModal(s), () => deleteMapsItem('street', s.id, s.name)));
        row.appendChild(atd);
        tbody.appendChild(row);
    });
}

function renderPositionsTable(positions) {
    const thead = document.getElementById('positionsTableHead');
    const tbody = document.getElementById('positionsTableBody');
    if (!thead || !tbody) return;
    tbody.innerHTML = '';
    const streetMap = buildNameMap(appState.streets);
    if (!positions || positions.length === 0) {
        thead.innerHTML = '';
        tbody.innerHTML = '<tr><td colspan="2" style="text-align:center;color:var(--text-muted)">No positions found</td></tr>';
        return;
    }
    const cols = Object.keys(positions[0]);
    thead.innerHTML = '';
    const hr = document.createElement('tr');
    [...cols, 'actions'].forEach(c => { const th = document.createElement('th'); th.textContent = UIComponents.formatHeader(c); hr.appendChild(th); });
    thead.appendChild(hr);
    positions.forEach(p => {
        const row = document.createElement('tr');
        cols.forEach(col => {
            const td = document.createElement('td');
            const v = p[col];
            if (col === 'street_id') td.textContent = streetMap[v] || v || '—';
            else if (col === 'ban') td.textContent = v && v.length ? `[${v.length}]` : '—';
            else if (v === null || v === undefined) td.textContent = '—';
            else if (col === 'created_at') td.textContent = new Date(v).toLocaleString();
            else td.textContent = v;
            row.appendChild(td);
        });
        const atd = document.createElement('td');
        atd.appendChild(UIComponents.createActionButtons(null, () => deleteMapsItem('position', p.id, `#${p.id}`)));
        row.appendChild(atd);
        tbody.appendChild(row);
    });
}

// ==================== MAPS: CRUD ====================

function showCityModal(city = null) {
    appState.editingCity = city;
    document.getElementById('cityModalTitle').textContent = city ? 'Edit City' : 'Add City';
    document.getElementById('cityName').value = city?.name || '';
    UIComponents.openModal('cityModal');
}

async function handleCitySave(e) {
    e.preventDefault();
    const name = document.getElementById('cityName').value.trim();
    try {
        if (appState.editingCity) {
            await api.updateCity(appState.editingCity.id, { name });
            UIComponents.showToast('City updated', 'success');
        } else {
            await api.createCity(name);
            UIComponents.showToast('City created', 'success');
        }
        UIComponents.closeModal('cityModal');
        await loadAllData();
    } catch (err) { UIComponents.showToast(`Error: ${err.message}`, 'error'); }
}

function showDistrictModal(district = null) {
    appState.editingDistrict = district;
    document.getElementById('districtModalTitle').textContent = district ? 'Edit District' : 'Add District';
    populateMapsDropdowns();
    document.getElementById('districtName').value = district?.name || '';
    document.getElementById('districtLname').value = district?.lname || '';
    document.getElementById('districtCity').value = district?.city || '';
    UIComponents.openModal('districtModal');
}

async function handleDistrictSave(e) {
    e.preventDefault();
    const name  = document.getElementById('districtName').value.trim();
    const lname = document.getElementById('districtLname').value.trim() || null;
    const city  = parseInt(document.getElementById('districtCity').value);
    try {
        if (appState.editingDistrict) {
            await api.updateDistrict(appState.editingDistrict.id, { name, lname, city });
            UIComponents.showToast('District updated', 'success');
        } else {
            await api.createDistrict(name, city, lname);
            UIComponents.showToast('District created', 'success');
        }
        UIComponents.closeModal('districtModal');
        await loadAllData();
    } catch (err) { UIComponents.showToast(`Error: ${err.message}`, 'error'); }
}

function showStreetModal(street = null) {
    appState.editingStreet = street;
    document.getElementById('streetModalTitle').textContent = street ? 'Edit Street' : 'Add Street';
    populateMapsDropdowns();
    document.getElementById('streetName').value = street?.name || '';
    document.getElementById('streetType').value = street?.type || '';
    document.getElementById('streetCity').value = street?.city_id || '';
    // populate districts for selected city
    const cityId = street?.city_id || null;
    const distSel = document.getElementById('streetDistrict');
    distSel.innerHTML = '<option value="">Select a district</option>';
    const dists = cityId ? appState.districts.filter(d => d.city === cityId) : appState.districts;
    dists.forEach(d => { const o = document.createElement('option'); o.value = d.id; o.textContent = d.name; distSel.appendChild(o); });
    distSel.value = street?.district_id || '';
    UIComponents.openModal('streetModal');
}

async function handleStreetSave(e) {
    e.preventDefault();
    const name        = document.getElementById('streetName').value.trim();
    const type        = document.getElementById('streetType').value.trim() || null;
    const cityId      = parseInt(document.getElementById('streetCity').value);
    const districtId  = parseInt(document.getElementById('streetDistrict').value);
    try {
        if (appState.editingStreet) {
            await api.updateStreet(appState.editingStreet.id, { name, type, city_id: cityId, district_id: districtId });
            UIComponents.showToast('Street updated', 'success');
        } else {
            await api.createStreet(name, districtId, cityId, type);
            UIComponents.showToast('Street created', 'success');
        }
        UIComponents.closeModal('streetModal');
        await loadAllData();
    } catch (err) { UIComponents.showToast(`Error: ${err.message}`, 'error'); }
}

function deleteMapsItem(type, id, name) {
    deleteContext.type = type;
    deleteContext.id   = id;
    deleteContext.name = name;
    document.getElementById('deleteMessage').textContent = `Are you sure you want to delete ${type} "${name}"?`;
    UIComponents.openModal('deleteModal');
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
