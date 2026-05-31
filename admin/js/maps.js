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
    // Reset downstream
    while (districtSelect.options.length > 1) districtSelect.remove(1);
    while (streetSelect.options.length > 1) streetSelect.remove(1);
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
    while (streetSelect.options.length > 1) streetSelect.remove(1);
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

    // Thêm event listener để xóa khi double click
    pointr.addEventListener('dblclick', () => {
        pointr.remove();
        pointrData.delete(pointrId);
        console.log(`Deleted pointr ${pointrId}`);
    });

    // Thêm event listener cho click
    pointr.addEventListener('click', (e) => {
        e.stopPropagation();
        const editor = document.querySelector('#editor');
        
        // Nếu ở mode move, set active pointr
        if (editor.value === 'move') {
            activePointrId = pointrId;
            updateActivePointrVisual();
            console.log(`Selected pointr ${pointrId}`);
        } else {
            // Nếu không ở mode move, chỉ log toạ độ
            const data = pointrData.get(pointrId);
            console.log(`Pointr ${pointrId}: clientX=${data.initialClientX}, clientY=${data.initialClientY}`);
        }
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

// Load locations khi trang tải xong
window.addEventListener('load', () => {
    loadLocations();
    enableGalleryDragScroll();
    initGalleryClickListener();
    initContainerScrollListener();
    initKeyboardListener();
    initFilterListeners();
});
