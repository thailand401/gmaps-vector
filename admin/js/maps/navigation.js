// ==================== NAVIGATION ====================

// Global variable to store all streets from database
let allStreetsData = [];

// Helper: populate a select, preserving negative-value options (Tạo Mới)
function populateSelect(selectEl, items, labelKey, valueKey) {
    const negativeOpts = Array.from(selectEl.options).filter(o => parseInt(o.value) < 0);
    while (selectEl.options.length > 1) selectEl.remove(1);
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        option.textContent = item[labelKey] || item.name || item.id;
        selectEl.appendChild(option);
    });
    negativeOpts.forEach(o => selectEl.appendChild(o));
}

// ==================== MODAL ====================

function openModal(html) {
    const modal = document.getElementById('modal');
    modal.innerHTML = html;
    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.remove('active');
    modal.innerHTML = '';
}

function showCreateCityModal() {
    openModal(`
        <div class="modal-content">
            <h2>Tạo City mới</h2>
            <form id="createForm">
                <label>Tên City <span class="required">*</span>
                    <input type="text" id="f_name" placeholder="VD: Hồ Chí Minh" required>
                </label>
                <div class="modal-error" id="modalError"></div>
                <div class="modal-actions">
                    <button type="button" class="btn-cancel" onclick="closeModal()">Huỷ</button>
                    <button type="submit" class="btn-submit">Tạo</button>
                </div>
            </form>
        </div>
    `);
    document.getElementById('createForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('f_name').value.trim();
        if (!name) return;
        try {
            const city = await apiClient.createCity(name);
            closeModal();
            await loadCities();
            document.getElementById('Cities').value = city.id;
            await loadDistricts(city.id);
        } catch (err) {
            document.getElementById('modalError').textContent = err.message;
        }
    });
}

function showCreateDistrictModal() {
    const cityId = document.getElementById('Cities').value;
    if (!cityId || cityId === 'all' || parseInt(cityId) < 0) {
        alert('Vui lòng chọn City trước khi tạo District.');
        document.getElementById('Districts').value = 'all';
        return;
    }
    const cityName = document.getElementById('Cities').selectedOptions[0].text;
    openModal(`
        <div class="modal-content">
            <h2>Tạo District mới</h2>
            <p class="modal-context">City: <strong>${cityName}</strong></p>
            <form id="createForm">
                <label>Tên District <span class="required">*</span>
                    <input type="text" id="f_name" placeholder="VD: Quận 1" required>
                </label>
                <label>Tên viết tắt
                    <input type="text" id="f_lname" placeholder="VD: Q1">
                </label>
                <div class="modal-error" id="modalError"></div>
                <div class="modal-actions">
                    <button type="button" class="btn-cancel" onclick="closeModal()">Huỷ</button>
                    <button type="submit" class="btn-submit">Tạo</button>
                </div>
            </form>
        </div>
    `);
    document.getElementById('createForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('f_name').value.trim();
        const lname = document.getElementById('f_lname').value.trim();
        if (!name) return;
        try {
            const district = await apiClient.createDistrict(name, cityId, lname || null);
            closeModal();
            await loadDistricts(cityId);
            document.getElementById('Districts').value = district.id;
            await loadStreets(district.id, cityId);
        } catch (err) {
            document.getElementById('modalError').textContent = err.message;
        }
    });
}

function showCreateStreetModal() {
    const cityId = document.getElementById('Cities').value;
    const districtId = document.getElementById('Districts').value;
    if (!cityId || cityId === 'all' || parseInt(cityId) < 0) {
        alert('Vui lòng chọn City trước khi tạo Street.');
        document.getElementById('Streets').value = 'all';
        return;
    }
    if (!districtId || districtId === 'all' || parseInt(districtId) < 0) {
        alert('Vui lòng chọn District trước khi tạo Street.');
        document.getElementById('Streets').value = 'all';
        return;
    }
    const cityName = document.getElementById('Cities').selectedOptions[0].text;
    const districtName = document.getElementById('Districts').selectedOptions[0].text;
    openModal(`
        <div class="modal-content">
            <h2>Tạo Street mới</h2>
            <p class="modal-context">City: <strong>${cityName}</strong> / District: <strong>${districtName}</strong></p>
            <form id="createForm">
                <label>Tên Street <span class="required">*</span>
                    <input type="text" id="f_name" placeholder="VD: Nguyễn Huệ" required>
                </label>
                <label>Loại đường
                    <input type="text" id="f_type" placeholder="VD: Đường, Phố, Đại lộ...">
                </label>
                <div class="modal-error" id="modalError"></div>
                <div class="modal-actions">
                    <button type="button" class="btn-cancel" onclick="closeModal()">Huỷ</button>
                    <button type="submit" class="btn-submit">Tạo</button>
                </div>
            </form>
        </div>
    `);
    document.getElementById('createForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('f_name').value.trim();
        const type = document.getElementById('f_type').value.trim();
        if (!name) return;
        try {
            const street = await apiClient.createStreet(name, districtId, cityId, type || null);
            closeModal();
            await loadStreets(districtId, cityId);
            document.getElementById('Streets').value = street.id;
        } catch (err) {
            document.getElementById('modalError').textContent = err.message;
        }
    });
}

// ==================== DATA LOADERS ====================

async function loadAllStreets() {
    try {
        allStreetsData = await apiClient.getAllStreets();
        console.log('[allStreetsData loaded]', allStreetsData);
    } catch (e) {
        console.error('Error loading all streets:', e);
        allStreetsData = [];
    }
}

async function loadCities() {
    try {
        const cities = await apiClient.getCities();
        populateSelect(document.getElementById('Cities'), cities, 'name', 'id');
    } catch (e) {
        console.error('Error loading cities:', e);
    }
}

async function loadDistricts(cityId = null) {
    const districtSelect = document.getElementById('Districts');
    const streetSelect = document.getElementById('Streets');
    for (let i = districtSelect.options.length - 1; i > 0; i--)
        if (parseInt(districtSelect.options[i].value) >= 0) districtSelect.remove(i);
    for (let i = streetSelect.options.length - 1; i > 0; i--)
        if (parseInt(streetSelect.options[i].value) >= 0) streetSelect.remove(i);
    if (!cityId) return;
    try {
        const districts = await apiClient.getDistricts(cityId);
        populateSelect(districtSelect, districts, 'name', 'id');
    } catch (e) {
        console.error('Error loading districts:', e);
    }
}

async function loadStreets(districtId = null, cityId = null) {
    const streetSelect = document.getElementById('Streets');
    for (let i = streetSelect.options.length - 1; i > 0; i--)
        if (parseInt(streetSelect.options[i].value) >= 0) streetSelect.remove(i);
    if (!districtId && !cityId) return;
    try {
        const streets = await apiClient.getStreets(districtId, cityId);
        populateSelect(streetSelect, streets, 'name', 'id');
    } catch (e) {
        console.error('Error loading streets:', e);
    }
}

// ==================== FILTER LISTENERS ====================

async function initFilterListeners() {
    await loadAllStreets(); // Load all streets data on init
    document.getElementById('Cities').addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === '-1') { showCreateCityModal(); return; }
        loadDistricts(val !== 'all' ? val : null);
    });
    document.getElementById('Districts').addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === '-2') { showCreateDistrictModal(); return; }
        const cityId = document.getElementById('Cities').value;
        loadStreets(val !== 'all' ? val : null, cityId !== 'all' ? cityId : null);
    });
    document.getElementById('Streets').addEventListener('change', (e) => {
        if (e.target.value === '-3') { showCreateStreetModal(); }
    });
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modal')) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}
