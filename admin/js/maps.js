// API Client instance
const apiClient = new ApiClient('http://localhost:4000/api');

// Store locations data
let locationsData = [];
let filteredLocations = [];

// Danh sách các map tile images trong folder images/
const MAP_IMAGES = [
    'images/map_1.jpg',
    'images/map_2.jpg',
    'images/map_3.jpg',
    'images/map_4.jpg',
];

// Hàm load và hiển thị map images
async function loadLocations() {
    locationsData = MAP_IMAGES.map((src, i) => ({ src, name: `Map ${i + 1}` }));
    filteredLocations = locationsData;
    await loadCities();
    displayLocations(locationsData);
}

// Helper: populate a select, preserving negative-value options (Tạo Mới)
function populateSelect(selectEl, items, labelKey, valueKey) {
    // Save options with negative values (e.g. -1, -2, -3)
    const negativeOpts = Array.from(selectEl.options).filter(o => parseInt(o.value) < 0);
    // Clear all except first placeholder
    while (selectEl.options.length > 1) selectEl.remove(1);
    // Add data items
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        option.textContent = item[labelKey] || item.name || item.id;
        selectEl.appendChild(option);
    });
    // Re-add negative options at end
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

// Hàm load Cities
async function loadCities() {
    try {
        const cities = await apiClient.getCities();
        populateSelect(document.getElementById('Cities'), cities, 'name', 'id');
    } catch (e) {
        console.error('Error loading cities:', e);
    }
}

// Hàm load Districts theo city
async function loadDistricts(cityId = null) {
    const districtSelect = document.getElementById('Districts');
    const streetSelect = document.getElementById('Streets');
    // Reset downstream - preserve negative options (Tạo Mới)
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

// Hàm load Streets theo district (hoặc city)
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

// Hàm hiển thị map images trên gallery
function displayLocations(locations) {
    const galleryDiv = document.getElementById('gallery');
    galleryDiv.innerHTML = '';
    
    locations.forEach((location, index) => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.dataset.index = index;
        
        item.innerHTML = `
            <div class="image-wrapper">
                <img src="${location.src}" alt="${location.name}">
            </div>
            <div class="image-info">${location.name}</div>
        `;
        
        galleryDiv.appendChild(item);
    });
}

// Hàm hiển thị tên map tile
function showLocationCoordinates(location) {
    const coordinatesDiv = document.querySelector('.coordinates');
    coordinatesDiv.innerHTML = `
        <div class="location-details">
            <p><strong>Map:</strong> ${location.name}</p>
        </div>
    `;
}

// Hàm lọc locations theo category (tạm thời disable)
function filterByCategory() {
    // For now, just show all locations
    // Can be implemented later when locations have category data
    filteredLocations = locationsData;
    displayLocations(filteredLocations);
}

// Hàm tìm kiếm map images
function searchLocations() {
    const searchInput = document.getElementById('search');
    const searchTerm = searchInput.value.toLowerCase();
    
    filteredLocations = locationsData.filter(loc =>
        loc.name.toLowerCase().includes(searchTerm) ||
        loc.src.toLowerCase().includes(searchTerm)
    );
    
    displayLocations(filteredLocations);
}

// Hàm enable drag scroll cho gallery
function enableGalleryDragScroll() {
    const gallery = document.querySelector('.container');
    const toolbar = document.querySelector('.toolbar');
    let isMouseDown = false;
    let startX = 0;
    let startY = 0;
    let scrollLeft = 0;
    let scrollTop = 0;

    // Mouse down: lưu vị trí ban đầu
    gallery.addEventListener('mousedown', (e) => {
        // Bỏ qua nếu click vào toolbar hoặc select element
        if (toolbar && toolbar.contains(e.target)) {
            return;
        }
        if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') {
            return;
        }

        isMouseDown = true;
        startX = e.pageX - gallery.offsetLeft;
        startY = e.pageY - gallery.offsetTop;
        scrollLeft = gallery.scrollLeft;
        scrollTop = gallery.scrollTop;
        e.preventDefault();
    });

    // Mouse move: scroll theo di chuyển chuột
    gallery.addEventListener('mousemove', (e) => {
        if (!isMouseDown) return;

        const x = e.pageX - gallery.offsetLeft;
        const y = e.pageY - gallery.offsetTop;
        
        // Tính toán khoảng cách di chuyển
        const walkX = (x - startX) * 1; // Nhân với 1 để điều chỉnh tốc độ scroll
        const walkY = (y - startY) * 1;

        // Cập nhật scroll position
        gallery.scrollLeft = scrollLeft - walkX;
        gallery.scrollTop = scrollTop - walkY;
    });

    // Mouse up: dừng drag
    document.addEventListener('mouseup', () => {
        isMouseDown = false;
    });

    // Khôi phục trạng thái khi rời khỏi gallery
    gallery.addEventListener('mouseleave', () => {
        isMouseDown = false;
    });
}

// Biến lưu trữ ID unique cho pointr
let pointrIdCounter = 0;
const pointrData = new Map();
let activePointrId = null;
let isDragging = false;

// ==================== STREET POINTS LIST ====================
let streetPointsList = []; // [{ id, streetId, x, y, ban, speed, park, lane, tool, flooding }]

function getCurrentStreetId() {
    const val = document.getElementById('Streets').value;
    const parsed = parseInt(val);
    return (!isNaN(parsed) && parsed > 0) ? parsed : null;
}

function logStreetPoints() {
    console.log('[streetPointsList]', JSON.parse(JSON.stringify(streetPointsList)));
}

function addToStreetPoints(pointrId, x, y) {
    streetPointsList.push({
        id: pointrId,
        streetId: getCurrentStreetId(),
        x, y,
        ban: [], speed: null, park: null, lane: null, tool: null, flooding: null
    });
    logStreetPoints();
}

function removeFromStreetPoints(pointrId) {
    streetPointsList = streetPointsList.filter(p => p.id !== pointrId);
    logStreetPoints();
}

function updateStreetPoint(pointrId, key, value) {
    const point = streetPointsList.find(p => p.id === pointrId);
    if (!point) return;
    if (key === 'ban') { point.ban.push(value); } else { point[key] = value; }
    logStreetPoints();
}

// Biến cho scroll wheel debounce
let debounceTimer = null;
let pendingDir = 0;

// Hàm cập nhật vị trí tất cả pointr theo scroll offset
function updatePointrPositions() {
    const container = document.querySelector('.container');
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    pointrData.forEach((data) => {
        // Vị trí mới = vị trí viewport ban đầu - scroll offset
        data.element.style.left = (data.initialClientX - scrollLeft) + 'px';
        data.element.style.top = (data.initialClientY - scrollTop) + 'px';
    });
}

// Hàm tạo pointr marker
function createPointr(clientX, clientY) {
    const pointrId = ++pointrIdCounter;
    const pointr = document.createElement('div');
    pointr.className = 'pointr';
    pointr.id = `pointr-${pointrId}`;
    pointr.style.left = clientX + 'px';
    pointr.style.top = clientY + 'px';

    // Lưu thông tin pointr (bao gồm vị trí viewport ban đầu)
    pointrData.set(pointrId, {
        id: pointrId,
        initialClientX: clientX,
        initialClientY: clientY,
        element: pointr,
        timestamp: new Date().toISOString()
    });

    // Ghi nhận vào streetPointsList
    addToStreetPoints(pointrId, clientX, clientY);

    // Drag-to-move: mousedown khởi động drag trong move mode
    pointr.addEventListener('mousedown', (e) => {
        const editor = document.querySelector('#editor');
        if (editor.value !== 'move') return;
        activePointrId = pointrId;
        updateActivePointrVisual();
        isDragging = true;
        e.stopPropagation(); // ngăn gallery drag-scroll
        e.preventDefault();
    });

    // Double click → xóa pointr
    pointr.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        deletePointr(pointrId);
    });

    // Click → hiện sub-menu (+ select nếu mode move)
    pointr.addEventListener('click', (e) => {
        e.stopPropagation();
        const editor = document.querySelector('#editor');
        if (editor.value === 'move') {
            activePointrId = pointrId;
            updateActivePointrVisual();
        }
        showPointrSubmenu(pointrId, pointr);
    });

    return { pointr, pointrId };
}

// Hàm cập nhật visual của active pointr
function updateActivePointrVisual() {
    document.querySelectorAll('.pointr').forEach(p => p.classList.remove('active'));
    if (activePointrId) {
        const activePointr = document.getElementById(`pointr-${activePointrId}`);
        if (activePointr) {
            activePointr.classList.add('active');
        }
    }
}

// ==================== POINTR SUB-MENU ====================
let submenuEl = null;

function closePointrSubmenu() {
    if (submenuEl) { submenuEl.remove(); submenuEl = null; }
}

function showPointrSubmenu(pointrId, anchorEl) {
    closePointrSubmenu();
    const rect = anchorEl.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'pointr-submenu';

    // Hiển thị bên phải pointr, căn chỉnh nếu sát mép màn hình
    const menuLeft = rect.right + 8;
    const menuTop = rect.top - 4;
    menu.style.left = menuLeft + 'px';
    menu.style.top = menuTop + 'px';

    const actions = [
        { label: 'Add Ban',      action: 'add-ban'      },
        { label: 'Set Speed',    action: 'set-speed'    },
        { label: 'Set Park',     action: 'set-park'     },
        { label: 'Set Lane',     action: 'set-lane'     },
        { label: 'Set Tool',     action: 'set-tool'     },
        { label: 'Set Flooding', action: 'set-flooding' },
        { label: 'Delete',       action: 'delete', danger: true },
    ];

    actions.forEach(({ label, action, danger }) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        if (danger) btn.classList.add('btn-danger');
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            closePointrSubmenu();
            handleSubmenuAction(action, pointrId);
        });
        menu.appendChild(btn);
    });

    submenuEl = menu;
    document.querySelector('.coordinates').appendChild(menu);
}

function handleSubmenuAction(action, pointrId) {
    switch (action) {
        case 'add-ban':      showAddBanModal(pointrId);                                              break;
        case 'set-speed':    showSetIntModal(pointrId, 'speed', 'Set Speed', 'Tốc độ (km/h)');      break;
        case 'set-park':     showSetBoolModal(pointrId, 'park', 'Set Park');                         break;
        case 'set-lane':     showSetIntModal(pointrId, 'lane', 'Set Lane', 'Số làn đường');          break;
        case 'set-tool':     showSetIntModal(pointrId, 'tool', 'Set Tool', 'Tool value');             break;
        case 'set-flooding': showSetBoolModal(pointrId, 'flooding', 'Set Flooding');                  break;
        case 'delete':       deletePointr(pointrId);                                                  break;
    }
}

function deletePointr(pointrId) {
    closePointrSubmenu();
    const data = pointrData.get(pointrId);
    if (data) { data.element.remove(); pointrData.delete(pointrId); }
    removeFromStreetPoints(pointrId);
    if (activePointrId === pointrId) { activePointrId = null; updateActivePointrVisual(); }
}

// ==================== POINTR MODALS ====================

function showAddBanModal(pointrId) {
    openModal(`
        <div class="modal-content">
            <h2>Add Ban</h2>
            <form id="createForm">
                <label>Type <span class="required">*</span>
                    <input type="text" id="f_type" placeholder="VD: no_truck" required>
                </label>
                <label>Hour <span class="required">*</span>
                    <input type="number" id="f_hour" placeholder="0–23" min="0" max="23" required>
                </label>
                <label>Weight (kg)
                    <input type="number" id="f_weight" placeholder="VD: 3500" min="0">
                </label>
                <div class="modal-error" id="modalError"></div>
                <div class="modal-actions">
                    <button type="button" class="btn-cancel" onclick="closeModal()">Huỷ</button>
                    <button type="submit" class="btn-submit">Thêm</button>
                </div>
            </form>
        </div>
    `);
    document.getElementById('createForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const type = document.getElementById('f_type').value.trim();
        const hour = parseInt(document.getElementById('f_hour').value);
        const weightRaw = document.getElementById('f_weight').value;
        const weight = weightRaw !== '' ? parseInt(weightRaw) : null;
        if (!type || isNaN(hour)) { document.getElementById('modalError').textContent = 'Vui lòng điền đầy đủ.'; return; }
        updateStreetPoint(pointrId, 'ban', { type, hour, weight });
        closeModal();
    });
}

function showSetIntModal(pointrId, key, title, label) {
    const current = streetPointsList.find(p => p.id === pointrId)?.[key];
    openModal(`
        <div class="modal-content">
            <h2>${title}</h2>
            <form id="createForm">
                <label>${label} <span class="required">*</span>
                    <input type="number" id="f_value" placeholder="Nhập số nguyên" required>
                </label>
                <div class="modal-error" id="modalError"></div>
                <div class="modal-actions">
                    <button type="button" class="btn-cancel" onclick="closeModal()">Huỷ</button>
                    <button type="submit" class="btn-submit">Lưu</button>
                </div>
            </form>
        </div>
    `);
    // Set current value safely after render
    if (current !== null && current !== undefined) {
        document.getElementById('f_value').value = current;
    }
    document.getElementById('createForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const value = parseInt(document.getElementById('f_value').value);
        if (isNaN(value)) { document.getElementById('modalError').textContent = 'Vui lòng nhập số nguyên.'; return; }
        updateStreetPoint(pointrId, key, value);
        closeModal();
    });
}

function showSetBoolModal(pointrId, key, title) {
    const current = streetPointsList.find(p => p.id === pointrId)?.[key];
    openModal(`
        <div class="modal-content">
            <h2>${title}</h2>
            <form id="createForm">
                <div class="bool-options">
                    <label class="radio-label">
                        <input type="radio" name="f_bool" value="true"> True
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="f_bool" value="false"> False
                    </label>
                </div>
                <div class="modal-error" id="modalError"></div>
                <div class="modal-actions">
                    <button type="button" class="btn-cancel" onclick="closeModal()">Huỷ</button>
                    <button type="submit" class="btn-submit">Lưu</button>
                </div>
            </form>
        </div>
    `);
    // Set current checked state after render
    if (current !== null && current !== undefined) {
        const radio = document.querySelector(`input[name="f_bool"][value="${current}"]`);
        if (radio) radio.checked = true;
    }
    document.getElementById('createForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const selected = document.querySelector('input[name="f_bool"]:checked');
        if (!selected) { document.getElementById('modalError').textContent = 'Vui lòng chọn một giá trị.'; return; }
        updateStreetPoint(pointrId, key, selected.value === 'true');
        closeModal();
    });
}

// Hàm di chuyển active pointr bằng arrow keys
function movePointr(direction) {
    if (!activePointrId) return;
    
    const data = pointrData.get(activePointrId);
    if (!data) return;

    const step = 5; // pixels
    switch(direction) {
        case 'ArrowUp':
            data.initialClientY -= step;
            break;
        case 'ArrowDown':
            data.initialClientY += step;
            break;
        case 'ArrowLeft':
            data.initialClientX -= step;
            break;
        case 'ArrowRight':
            data.initialClientX += step;
            break;
    }
    
    updatePointrPositions();
}

// Hàm xử lý click trên gallery
function handleGalleryClick(e) {
    // Nếu click vào toolbar, select, input thì bỏ qua
    const toolbar = document.querySelector('.toolbar');
    if (toolbar && toolbar.contains(e.target)) return;
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;

    // Nếu click vào pointr
    if (e.target.classList.contains('pointr')) {
        const editor = document.querySelector('#editor');
        if (editor.value === 'move') {
            // Set active pointr
            const pointrId = parseInt(e.target.id.split('-')[1]);
            activePointrId = pointrId;
            updateActivePointrVisual();
            console.log(`Selected pointr ${pointrId}`);
        }
        return;
    }

    // Chỉ tạo pointr khi editor="create"
    const editor = document.querySelector('#editor');
    if (editor.value !== 'create') return;

    // Lấy toạ độ click tương đối với viewport
    const clientX = e.clientX;
    const clientY = e.clientY;

    const { pointr } = createPointr(clientX, clientY);
    const coordinates = document.querySelector('.coordinates');
    coordinates.appendChild(pointr);

    console.log(`Created pointr at x=${clientX}, y=${clientY}`);
}

// Khởi tạo click listener cho gallery
function initGalleryClickListener() {
    const gallery = document.querySelector('.gallery');
    gallery.addEventListener('click', handleGalleryClick);
}

// Khởi tạo scroll listener cho container
function initContainerScrollListener() {
    const container = document.querySelector('.container');
    container.addEventListener('scroll', updatePointrPositions);
}

// Hàm thay đổi giá trị select editor theo direction
function changeSelectValue(direction) {
    const editor = document.querySelector('#editor');
    const options = Array.from(editor.querySelectorAll('option'));
    let currentIndex = options.findIndex(opt => opt.value === editor.value);
    
    if (direction > 0) {
        // Direction +1 => next option
        currentIndex = (currentIndex + 1) % options.length;
    } else if (direction < 0) {
        // Direction -1 => previous option
        currentIndex = (currentIndex - 1 + options.length) % options.length;
    }
    
    editor.value = options[currentIndex].value;
    console.log(`Changed editor to: ${options[currentIndex].value}`);
}

// Khởi tạo keyboard listener cho arrow keys
function initKeyboardListener() {
    document.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            const editor = document.querySelector('#editor');
            if (editor.value === 'move' && activePointrId) {
                movePointr(e.key);
                e.preventDefault();
            }
        }
    }, true);
}

// Khởi tạo filter listeners với cascade Cities → Districts → Streets + modal
function initFilterListeners() {
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
    // Đóng modal khi click ra ngoài
    document.getElementById('modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modal')) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

// Khởi tạo document-level drag handlers cho move mode
function initPointrDrag() {
    document.addEventListener('mousemove', (e) => {
        if (!isDragging || activePointrId === null) return;
        const data = pointrData.get(activePointrId);
        if (!data) { isDragging = false; return; }
        const container = document.querySelector('.container');
        data.initialClientX = e.clientX + container.scrollLeft;
        data.initialClientY = e.clientY + container.scrollTop;
        data.element.style.left = e.clientX + 'px';
        data.element.style.top = e.clientY + 'px';
    });
    document.addEventListener('mouseup', () => { isDragging = false; });
    // Đóng sub-menu khi click ra ngoài
    document.addEventListener('click', (e) => {
        if (submenuEl && !submenuEl.contains(e.target)) closePointrSubmenu();
    });
}

// Khởi tạo editor mode listener (body class + cursor)
function initEditorListener() {
    const editor = document.getElementById('editor');
    editor.addEventListener('change', (e) => {
        document.body.className = `mode-${e.target.value}`;
        activePointrId = null;
        updateActivePointrVisual();
    });
}

// Load locations khi trang tải xong
window.addEventListener('load', () => {
    loadLocations();
    enableGalleryDragScroll();
    initGalleryClickListener();
    initContainerScrollListener();
    initKeyboardListener();
    initFilterListeners();
    initPointrDrag();
    initEditorListener();
});
