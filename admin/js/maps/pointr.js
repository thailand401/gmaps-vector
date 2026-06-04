// ==================== POINTR STATE ====================

let pointrIdCounter = 0;
const pointrData = new Map();
let activePointrId = null;
let isDragging = false;

// ==================== STREET POINTS LIST ====================

let streetPointsList = []; // [{ id, streetId, x, y, ban, speed, park, lane, toll, flooding }]

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
        ban: [], speed: null, park: null, lane: null, toll: null, flooding: null
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

// ==================== POINTR POSITIONS ====================

function updatePointrPositions() {
    const container = document.querySelector('.container');
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;
    pointrData.forEach((data) => {
        data.element.style.left = (data.initialClientX - scrollLeft) + 'px';
        data.element.style.top = (data.initialClientY - scrollTop) + 'px';
    });
}

// ==================== POINTR CREATION ====================

function createPointr(clientX, clientY, title = '', lat = null, lon = null) {
    const pointrId = ++pointrIdCounter;
    const pointr = document.createElement('div');
    pointr.className = 'pointr';
    pointr.id = `pointr-${pointrId}`;
    pointr.style.left = clientX + 'px';
    pointr.style.top = clientY + 'px';

    if (title) {
        const tooltip = document.createElement('div');
        tooltip.className = 'pointr-tooltip';
        tooltip.textContent = title;
        pointr.appendChild(tooltip);
    }

    pointrData.set(pointrId, {
        id: pointrId,
        initialClientX: clientX,
        initialClientY: clientY,
        lat: lat,
        lon: lon,
        element: pointr,
        timestamp: new Date().toISOString()
    });

    addToStreetPoints(pointrId, clientX, clientY);

    pointr.addEventListener('mousedown', (e) => {
        const editor = document.querySelector('#editor');
        if (editor.value !== 'move') return;
        activePointrId = pointrId;
        updateActivePointrVisual();
        isDragging = true;
        e.stopPropagation();
        e.preventDefault();
    });

    pointr.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        deletePointr(pointrId);
    });

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

function updateActivePointrVisual() {
    document.querySelectorAll('.pointr').forEach(p => p.classList.remove('active'));
    if (activePointrId) {
        const el = document.getElementById(`pointr-${activePointrId}`);
        if (el) el.classList.add('active');
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
    menu.style.left = (rect.right + 8) + 'px';
    menu.style.top = (rect.top - 4) + 'px';

    const actions = [
        { label: 'Add Ban',      action: 'add-ban'      },
        { label: 'Set Speed',    action: 'set-speed'    },
        { label: 'Set Park',     action: 'set-park'     },
        { label: 'Set Lane',     action: 'set-lane'     },
        { label: 'Set Toll',     action: 'set-toll'     },
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
        case 'set-toll':     showSetIntModal(pointrId, 'toll', 'Set Toll', 'Phí đường (VNĐ)');      break;
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

// ==================== POINTR MOVEMENT ====================

function movePointr(direction) {
    if (!activePointrId) return;
    const data = pointrData.get(activePointrId);
    if (!data) return;
    const step = 0.5;
    switch (direction) {
        case 'ArrowUp':    data.initialClientY -= step; break;
        case 'ArrowDown':  data.initialClientY += step; break;
        case 'ArrowLeft':  data.initialClientX -= step; break;
        case 'ArrowRight': data.initialClientX += step; break;
    }
    updatePointrPositions();
}

function rescalePointrs(oldSize, newSize) {
    if (!oldSize || !newSize || oldSize === newSize) return;
    const ratio = newSize / oldSize;
    const sizePer = newSize / 2400;
    pointrData.forEach((data) => {
        if (data.lat !== null && data.lon !== null) {
            const pos = latLonToPixel(data.lat, data.lon, sizePer);
            data.initialClientX = pos.left;
            data.initialClientY = pos.top;
        } else {
            data.initialClientX *= ratio;
            data.initialClientY *= ratio;
        }
    });
    updatePointrPositions();
}

// ==================== GALLERY INTERACTION ====================

function enableGalleryDragScroll() {
    const gallery = document.querySelector('.container');
    const toolbar = document.querySelector('.toolbar');
    let isMouseDown = false;
    let startX = 0, startY = 0, scrollLeft = 0, scrollTop = 0;

    gallery.addEventListener('mousedown', (e) => {
        if (toolbar && toolbar.contains(e.target)) return;
        if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
        isMouseDown = true;
        startX = e.pageX - gallery.offsetLeft;
        startY = e.pageY - gallery.offsetTop;
        scrollLeft = gallery.scrollLeft;
        scrollTop = gallery.scrollTop;
        e.preventDefault();
    });

    gallery.addEventListener('mousemove', (e) => {
        if (!isMouseDown) return;
        gallery.scrollLeft = scrollLeft - (e.pageX - gallery.offsetLeft - startX);
        gallery.scrollTop  = scrollTop  - (e.pageY - gallery.offsetTop  - startY);
    });

    document.addEventListener('mouseup', () => { isMouseDown = false; });
    gallery.addEventListener('mouseleave', () => { isMouseDown = false; });
}

function handleGalleryClick(e) {
    const toolbar = document.querySelector('.toolbar');
    if (toolbar && toolbar.contains(e.target)) return;
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;

    if (e.target.classList.contains('pointr')) {
        const editor = document.querySelector('#editor');
        if (editor.value === 'move') {
            activePointrId = parseInt(e.target.id.split('-')[1]);
            updateActivePointrVisual();
        }
        return;
    }

    const editor = document.querySelector('#editor');
    if (editor.value !== 'create') return;

    const { pointr } = createPointr(e.clientX, e.clientY);
    document.querySelector('.coordinates').appendChild(pointr);
}

// ==================== INIT ====================

function initGalleryClickListener() {
    document.querySelector('.gallery').addEventListener('click', handleGalleryClick);
}

function initContainerScrollListener() {
    document.querySelector('.container').addEventListener('scroll', updatePointrPositions);
}

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
    document.addEventListener('click', (e) => {
        if (submenuEl && !submenuEl.contains(e.target)) closePointrSubmenu();
    });
}

function initEditorListener() {
    const editor = document.getElementById('editor');
    editor.addEventListener('change', (e) => {
        document.body.className = `mode-${e.target.value}`;
        activePointrId = null;
        updateActivePointrVisual();
    });
}
