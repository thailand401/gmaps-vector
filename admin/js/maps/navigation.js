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

function showCreateStreetModal(onCreated, onCancel) {
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

    // Build type dropdown from allStreetsData distinct types
    const knownTypes = [...new Set((allStreetsData || []).map(s => s.type).filter(Boolean))].sort();
    const typeOptions = knownTypes.map(t => `<option value="${t}">${t}</option>`).join('');
    const typeField = knownTypes.length > 0
        ? `<select id="f_type">
              <option value="">-- Không có --</option>
              ${typeOptions}
              <option value="__custom__">-- Nhập mới... --</option>
           </select>
           <input type="text" id="f_type_custom" placeholder="Nhập loại đường..." style="display:none;margin-top:4px;">`
        : `<input type="text" id="f_type" placeholder="VD: Đường, Phố, Đại lộ...">`;

    openModal(`
        <div class="modal-content">
            <h2>Tạo Street mới</h2>
            <p class="modal-context">City: <strong>${cityName}</strong> / District: <strong>${districtName}</strong></p>
            <form id="createForm">
                <label>Tên Street <span class="required">*</span>
                    <input type="text" id="f_name" placeholder="VD: Nguyễn Huệ" required>
                </label>
                <label>Loại đường
                    ${typeField}
                </label>
                <div class="modal-error" id="modalError"></div>
                <div class="modal-actions">
                    <button type="button" class="btn-cancel" id="createStreetCancel">Huỷ</button>
                    <button type="submit" class="btn-submit">Tạo</button>
                </div>
            </form>
        </div>
    `);

    // Show/hide custom type input
    const typeSelect = document.getElementById('f_type');
    const typeCustom = document.getElementById('f_type_custom');
    if (typeSelect && typeSelect.tagName === 'SELECT') {
        typeSelect.addEventListener('change', () => {
            if (typeCustom) typeCustom.style.display = typeSelect.value === '__custom__' ? 'block' : 'none';
        });
    }

    document.getElementById('createStreetCancel').addEventListener('click', () => {
        closeModal();
        if (typeof onCancel === 'function') try { onCancel(); } catch (_) {}
    });

    document.getElementById('createForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('f_name').value.trim();
        const typeEl = document.getElementById('f_type');
        let type = typeEl ? typeEl.value.trim() : '';
        if (type === '__custom__') {
            type = (document.getElementById('f_type_custom')?.value || '').trim();
        }
        if (!name) return;
        try {
            const street = await apiClient.createStreet(name, districtId, cityId, type || null);
            // Inject into allStreetsData immediately so showSaveAllModal can find it
            if (typeof allStreetsData !== 'undefined' && Array.isArray(allStreetsData)) {
                if (!allStreetsData.find(s => s.id === street.id)) {
                    allStreetsData.push(street);
                }
            }
            closeModal();
            await loadStreets(districtId, cityId);
            document.getElementById('Streets').value = street.id;
            if (typeof onCreated === 'function') {
                try { onCreated(street.id); } catch (_) {}
            }
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

const LS_CITY     = 'maps_city';
const LS_DISTRICT = 'maps_district';
const LS_STREET   = 'maps_street';

function scrollToStreet(streetId) {
    let found = null;
    for (const [, d] of pointrReload) {
        if (Array.isArray(d.streets) && d.streets.includes(streetId)) { found = d; break; }
    }
    if (!found) {
        for (const [, d] of pointrData) {
            if (Array.isArray(d.streets) && d.streets.includes(streetId)) { found = d; break; }
        }
    }
    if (found) {
        const container = document.querySelector('.container');
        container.scrollLeft = found.initialClientX - container.clientWidth  / 2;
        container.scrollTop  = found.initialClientY - container.clientHeight / 2;
    }
    drawStreetPath(streetId);
}

async function initFilterListeners() {
    await loadAllStreets(); // Load all streets data on init
    await loadAllPointrsFromDB(); // Load all existing positions mapped to allStreetsData

    // ── Restore last selected city / district / street ────────────────────────
    const savedCity     = localStorage.getItem(LS_CITY);
    const savedDistrict = localStorage.getItem(LS_DISTRICT);
    const savedStreet   = localStorage.getItem(LS_STREET);

    if (savedCity) {
        const citySelect = document.getElementById('Cities');
        citySelect.value = savedCity;
        if (citySelect.value === savedCity) {
            await loadDistricts(savedCity);
        }
    }
    if (savedDistrict) {
        const districtSelect = document.getElementById('Districts');
        districtSelect.value = savedDistrict;
        if (districtSelect.value === savedDistrict) {
            const cityId = document.getElementById('Cities').value;
            await loadStreets(savedDistrict, cityId !== 'all' ? cityId : null);
        }
    }
    if (savedStreet) {
        const streetSelect = document.getElementById('Streets');
        streetSelect.value = savedStreet;
        if (streetSelect.value === savedStreet) {
            const streetId = parseInt(savedStreet);
            if (streetId > 0) scrollToStreet(streetId);
        }
    }
    // ─────────────────────────────────────────────────────────────────────────

    document.getElementById('Cities').addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === '-1') { showCreateCityModal(); return; }
        localStorage.setItem(LS_CITY, val);
        localStorage.removeItem(LS_DISTRICT);
        localStorage.removeItem(LS_STREET);
        clearStreetPath();
        loadDistricts(val !== 'all' ? val : null);
    });
    document.getElementById('Districts').addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === '-2') { showCreateDistrictModal(); return; }
        localStorage.setItem(LS_DISTRICT, val);
        localStorage.removeItem(LS_STREET);
        clearStreetPath();
        const cityId = document.getElementById('Cities').value;
        loadStreets(val !== 'all' ? val : null, cityId !== 'all' ? cityId : null);
    });
    document.getElementById('Streets').addEventListener('change', (e) => {
        if (e.target.value === '-3') { showCreateStreetModal(); return; }
        const streetId = parseInt(e.target.value);
        if (!streetId || streetId <= 0) return;
        localStorage.setItem(LS_STREET, String(streetId));
        scrollToStreet(streetId);
    });
    // Show modal listing streets and their newly created pointrs
    const saveBtn = document.getElementById('saveAll');
    if (saveBtn) {
        saveBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof showSaveAllModal === 'function') showSaveAllModal();
        });
    }
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modal')) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

// ==================== STREET PANEL ====================

let _streetPanelOpen = false;
let _streetPanelDebounce = null;

function initStreetPanel() {
    const toggle = document.getElementById('streetPanelToggle');
    const panel  = document.getElementById('streetPanel');
    if (!toggle || !panel) return;

    toggle.addEventListener('click', () => {
        _streetPanelOpen = !_streetPanelOpen;
        panel.classList.toggle('open', _streetPanelOpen);
        toggle.classList.toggle('open', _streetPanelOpen);
        if (_streetPanelOpen) refreshStreetPanel();
    });

    // Refresh on scroll (debounced 400ms)
    document.querySelector('.container').addEventListener('scroll', () => {
        if (!_streetPanelOpen) return;
        clearTimeout(_streetPanelDebounce);
        _streetPanelDebounce = setTimeout(refreshStreetPanel, 400);
    });
}

function getScreenCenterLatLon() {
    const container = document.querySelector('.container');
    const cx = container.scrollLeft + container.clientWidth  / 2;
    const cy = container.scrollTop  + container.clientHeight / 2;
    const sizePer = parseInt(document.getElementById('sSize').value) / 2400;
    return pixelToLatLon(cx, cy, sizePer);
}

function haverDistKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function refreshStreetPanel() {
    const listEl = document.getElementById('streetPanelList');
    if (!listEl) return;

    const { lat: cLat, lon: cLon } = getScreenCenterLatLon();

    // Collect (streetId → minDist) using loaded pointrs
    const sidDist = new Map();
    const checkPtrs = (d) => {
        if (d.lat == null || d.lon == null) return;
        const dist = haverDistKm(cLat, cLon, d.lat, d.lon);
        if (dist > 5) return;
        (d.streets || []).forEach(sid => {
            if (!sidDist.has(sid) || dist < sidDist.get(sid)) sidDist.set(sid, dist);
        });
    };
    if (typeof pointrReload !== 'undefined') pointrReload.forEach(checkPtrs);
    if (typeof pointrData   !== 'undefined') pointrData.forEach(checkPtrs);

    if (sidDist.size === 0) {
        listEl.innerHTML = '<div class="street-panel-empty">Không có street nào trong 5km</div>';
        return;
    }

    // Sort by distance, then name
    const entries = [...sidDist.entries()]
        .map(([sid, dist]) => ({ sid, dist, street: (allStreetsData || []).find(s => s.id === sid) }))
        .filter(e => e.street)
        .sort((a, b) => a.dist - b.dist || (a.street.name || '').localeCompare(b.street.name || ''));

    const currentStreetId = parseInt(document.getElementById('Streets').value) || null;

    listEl.innerHTML = '';
    entries.forEach(({ sid, dist, street }) => {
        const item = document.createElement('div');
        item.className = 'street-panel-item' + (sid === currentStreetId ? ' active' : '');
        item.dataset.streetId = sid;

        const distStr = dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`;
        const typeStr = street.type ? ` · ${street.type}` : '';

        item.innerHTML = `
            <span class="street-panel-item-name">${escapeHtml(street.name || '')}</span>
            <span class="street-panel-item-meta">${distStr}${typeStr}</span>
        `;

        item.addEventListener('click', () => selectStreetFromPanel(sid));
        listEl.appendChild(item);
    });
}

async function selectStreetFromPanel(streetId) {
    const street = (allStreetsData || []).find(s => s.id === streetId);
    if (!street) return;

    const cityId     = street.city_id;
    const districtId = street.district_id;

    // 1. Set City
    const citySelect = document.getElementById('Cities');
    if (cityId && citySelect.value != cityId) {
        citySelect.value = cityId;
        localStorage.setItem('maps_city', cityId);
        await loadDistricts(cityId);
    }

    // 2. Set District
    const districtSelect = document.getElementById('Districts');
    if (districtId && districtSelect.value != districtId) {
        districtSelect.value = districtId;
        localStorage.setItem('maps_district', districtId);
        await loadStreets(districtId, cityId);
    }

    // 3. Set Street
    const streetSelect = document.getElementById('Streets');
    streetSelect.value = streetId;
    localStorage.setItem('maps_street', String(streetId));

    // Highlight active item in panel
    document.querySelectorAll('.street-panel-item').forEach(el => {
        el.classList.toggle('active', parseInt(el.dataset.streetId) === streetId);
    });

    // Draw path on map
    if (typeof scrollToStreet === 'function') scrollToStreet(streetId);
}

