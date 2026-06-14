// ==================== POINTR STATE ====================

let pointrIdCounter = 0;
const pointrData = new Map();   // new/edited pointrs (to be saved/updated)
const pointrReload = new Map(); // pointrs loaded from DB (read-only until edited)
const renderedDbIds = new Set(); // tracks DB position ids already rendered — prevents duplicate render
let activePointrId = null;
const selectedPointrIds = new Set(); // multi-select via shift+click
let isDragging = false;
let activeStreetPathId = null; // street currently being visualised with a path

// ==================== RELOAD HELPERS ====================

/**
 * Move a reload pointr into pointrData so it gets included in the next save (update path).
 * No-op if the pointr is already in pointrData or doesn't exist.
 */
function markPointrAsEdited(pointrId) {
    if (!pointrReload.has(pointrId)) return;
    const data = pointrReload.get(pointrId);
    pointrData.set(pointrId, data);
    pointrReload.delete(pointrId);
    if (data.element) data.element.classList.remove('pointr-reload');
    console.log(`[pointr] #${pointrId} moved to edit queue (dbId=${data.dbId})`);
}

/**
 * Fetch ALL positions from DB and render them as reload pointrs.
 * Street names are resolved from allStreetsData.
 * Already-loaded positions (by dbId) are skipped to avoid duplicates.
 */
async function loadAllPointrsFromDB() {
    // renderedDbIds is module-level; also sync from current maps in case of hot-reload edge cases
    pointrReload.forEach(d => { if (d.dbId) renderedDbIds.add(d.dbId); });
    pointrData.forEach(d => { if (d.dbId) renderedDbIds.add(d.dbId); });

    try {
        const _apiBase = location.hostname === 'localhost' ? 'http://localhost:4000/api' : '/api';
        const resp = await fetch(`${_apiBase}/positions`, { headers: { 'X-API-Key': sessionStorage.getItem('admin_api_key') || '' } });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const positions = await resp.json();
        if (!Array.isArray(positions) || positions.length === 0) return;

        const sizePer = parseInt(document.getElementById('sSize').value) / 2400;
        const coordinatesEl = document.querySelector('.coordinates');

        positions.forEach(pos => {
            if (!pos.id || renderedDbIds.has(pos.id)) return;
            // pos.y = lat, pos.x = lon (from backend _db_pos_to_model)
            if (pos.y == null || pos.x == null) return;

            // Resolve street name(s) from allStreetsData
            const streetIds = Array.isArray(pos.streets) ? pos.streets : [];
            const streetName = streetIds
                .map(sid => (typeof allStreetsData !== 'undefined' ? allStreetsData : []).find(s => s.id === sid)?.name)
                .filter(Boolean)
                .join(' - ');

            const pixelPos = latLonToPixel(pos.y, pos.x, sizePer);
            const { pointr, pointrId } = createPointr(pixelPos.left, pixelPos.top, streetName, pos.y, pos.x);

            // createPointr adds to pointrData; move the entry to pointrReload
            const data = pointrData.get(pointrId);
            if (data) {
                data.dbId    = pos.id;
                data.streets = streetIds;
                pointrReload.set(pointrId, data);
                pointrData.delete(pointrId);
            }

            // Sync streetPointsList entry with DB values
            const sp = streetPointsList.find(p => p.id === pointrId);
            if (sp) {
                sp.streetId  = streetIds[0] ?? null;
                sp.ban       = Array.isArray(pos.ban) ? pos.ban : [];
                sp.speed     = pos.speed     ?? null;
                sp.park      = pos.park      ?? null;
                sp.lane      = pos.lane      ?? null;
                sp.toll      = pos.tool      ?? null; // DB column is 'tool'
                sp.flooding  = pos.flooding  ?? null;
            }

            pointr.classList.add('pointr-reload');
            coordinatesEl.appendChild(pointr);
            renderedDbIds.add(pos.id);
        });

        console.log(`[loadAllPointrsFromDB] loaded ${positions.length} position(s)`);
    } catch (err) {
        console.error('[loadAllPointrsFromDB] Error:', err);
    }
}

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
    const applyPos = (data) => {
        data.element.style.left = (data.initialClientX - scrollLeft) + 'px';
        data.element.style.top  = (data.initialClientY - scrollTop)  + 'px';
    };
    pointrData.forEach(applyPos);
    pointrReload.forEach(applyPos);
    refreshStreetPath();
    if (typeof updatePoiMarkerPositions === 'function') updatePoiMarkerPositions();
}

// ==================== STREET PATH ====================

function collectStreetPointrs(streetId) {
    const pts = [];
    pointrReload.forEach(d => { if (Array.isArray(d.streets) && d.streets.includes(streetId)) pts.push(d); });
    pointrData.forEach(d => {   if (Array.isArray(d.streets) && d.streets.includes(streetId)) pts.push(d); });
    return pts;
}

// Geographic distance squared (in degrees²) — good enough for relative comparison within a city
function _geoDist2(a, b) {
    const dLat = (a.lat ?? 0) - (b.lat ?? 0);
    const dLon = (a.lon ?? 0) - (b.lon ?? 0);
    // scale lon by cos(lat) to approximate equal-distance in both axes
    const cosLat = Math.cos(((a.lat ?? 0) * Math.PI) / 180);
    return dLat * dLat + (dLon * dLon * cosLat * cosLat);
}

function nearestNeighborSort(pts) {
    if (pts.length <= 1) return [...pts];

    // Find the pair of points with the maximum distance (diameter of the set).
    // One of those endpoints is the natural start of the street path.
    let maxD = -1, startIdx = 0;
    for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
            const d = _geoDist2(pts[i], pts[j]);
            if (d > maxD) { maxD = d; startIdx = i; }
        }
    }

    const rem = [...pts];
    const result = [];
    let cur = rem.splice(startIdx, 1)[0];
    result.push(cur);
    while (rem.length > 0) {
        let minD = Infinity, minI = 0;
        for (let i = 0; i < rem.length; i++) {
            const d = _geoDist2(rem[i], cur);
            if (d < minD) { minD = d; minI = i; }
        }
        cur = rem.splice(minI, 1)[0];
        result.push(cur);
    }
    return result;
}

function drawStreetPath(streetId) {
    activeStreetPathId = streetId;
    refreshStreetPath();
}

function clearStreetPath() {
    activeStreetPathId = null;
    const svg = document.getElementById('street-path-svg');
    if (svg) svg.innerHTML = '';
}

const _PATH_COLORS = ['#2196F3','#E91E63','#4CAF50','#FF9800','#9C27B0','#00BCD4','#FF5722','#8BC34A','#F44336','#3F51B5'];

function _appendPolyline(svg, pts, color) {
    const sorted = nearestNeighborSort(pts);
    const container = document.querySelector('.container');
    const sl = container.scrollLeft;
    const st = container.scrollTop;
    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('points', sorted.map(d => `${d.initialClientX - sl},${d.initialClientY - st}`).join(' '));
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke', color);
    polyline.setAttribute('stroke-width', '2');
    polyline.setAttribute('stroke-dasharray', '6,3');
    polyline.setAttribute('opacity', '0.8');
    svg.appendChild(polyline);
}

function refreshStreetPath() {
    const svg = document.getElementById('street-path-svg');
    if (!svg) return;
    svg.innerHTML = '';

    const showAll = document.getElementById('sIsStreetPath')?.checked;

    if (showAll) {
        // Draw paths for all streets that have pointrs (Maps → iterate values)
        const streetIds = new Set();
        pointrReload.forEach(d => { if (Array.isArray(d.streets)) d.streets.forEach(sid => streetIds.add(sid)); });
        pointrData.forEach(d => {   if (Array.isArray(d.streets)) d.streets.forEach(sid => streetIds.add(sid)); });
        let colorIdx = 0;
        streetIds.forEach(sid => {
            const pts = collectStreetPointrs(sid);
            if (pts.length >= 2) {
                const color = sid === activeStreetPathId
                    ? '#2196F3'
                    : _PATH_COLORS[(colorIdx + 1) % _PATH_COLORS.length];
                colorIdx++;
                _appendPolyline(svg, pts, color);
            }
        });
        // Also draw active street on top if not already covered
        if (activeStreetPathId && !streetIds.has(activeStreetPathId)) {
            const pts = collectStreetPointrs(activeStreetPathId);
            if (pts.length >= 2) _appendPolyline(svg, pts, '#2196F3');
        }
        return;
    }

    // Default: draw only the active street
    if (!activeStreetPathId) return;
    const pts = collectStreetPointrs(activeStreetPathId);
    if (pts.length < 2) return;
    _appendPolyline(svg, pts, '#2196F3');
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

    const currentStreetId = getCurrentStreetId();
    pointrData.set(pointrId, {
        id: pointrId,
        initialClientX: clientX,
        initialClientY: clientY,
        lat: lat,
        lon: lon,
        streets: currentStreetId ? [currentStreetId] : [],
        element: pointr,
        timestamp: new Date().toISOString()
    });

    addToStreetPoints(pointrId, clientX, clientY);
    console.log(pointrId);
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
        if (e.shiftKey) {
            // Toggle multi-select; no submenu
            if (selectedPointrIds.has(pointrId)) {
                selectedPointrIds.delete(pointrId);
            } else {
                selectedPointrIds.add(pointrId);
            }
            closePointrSubmenu();
            updateActivePointrVisual();
            return;
        }
        // Regular click — clear multi-selection
        selectedPointrIds.clear();
        if (editor.value === 'move') {
            activePointrId = pointrId;
            updateActivePointrVisual();
        }
        showPointrSubmenu(pointrId, pointr);
    });

    return { pointr, pointrId };
}

function updateActivePointrVisual() {
    document.querySelectorAll('.pointr').forEach(p => {
        p.classList.remove('active');
        p.classList.remove('selected');
    });
    selectedPointrIds.forEach(pid => {
        const el = document.getElementById(`pointr-${pid}`);
        if (el) el.classList.add('selected');
    });
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
        { label: 'Set Node',     action: 'set-node'     },
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
    // Any edit action on a reload pointr moves it into pointrData for update
    if (action !== 'delete') markPointrAsEdited(pointrId);
    switch (action) {
        case 'set-node':     showSetNodeModal(pointrId);                                             break;
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
    const data = pointrData.get(pointrId) || pointrReload.get(pointrId);
    if (data) {
        // If this pointr exists in DB, delete it cascade (remove from Positions + Streets.positions)
        if (data.dbId) {
            const _apiBaseCascade = location.hostname === 'localhost' ? 'http://localhost:4000/api' : '/api';
            fetch(`${_apiBaseCascade}/positions/${data.dbId}/cascade`, { method: 'DELETE', headers: { 'X-API-Key': sessionStorage.getItem('admin_api_key') || '' } })
                .then(r => { if (!r.ok) r.text().then(t => console.error('[deletePointr] cascade failed:', t)); })
                .catch(err => console.error('[deletePointr] cascade error:', err));
        }
        if (data.dbId) renderedDbIds.delete(data.dbId);
        data.element.remove();
        pointrData.delete(pointrId);
        pointrReload.delete(pointrId);
    }
    removeFromStreetPoints(pointrId);
    selectedPointrIds.delete(pointrId);
    if (activePointrId === pointrId) { activePointrId = null; updateActivePointrVisual(); }
    refreshStreetPath();
}

// ==================== POINTR MODALS ====================

// Return streets from allStreetsData that have at least one pointr within radiusKm of (lat, lon)
function getStreetsNearPoint(lat, lon, radiusKm) {
    if (lat == null || lon == null) return allStreetsData || [];
    const R = 6371;
    function haverDist(lat1, lon1, lat2, lon2) {
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    const nearSids = new Set();
    const check = (d) => {
        if (d.lat == null || d.lon == null) return;
        if (haverDist(lat, lon, d.lat, d.lon) <= radiusKm) {
            (d.streets || []).forEach(sid => nearSids.add(sid));
        }
    };
    pointrReload.forEach(check);
    pointrData.forEach(check);
    const nearby = (allStreetsData || []).filter(s => nearSids.has(s.id));
    return nearby.length > 0 ? nearby : (allStreetsData || []);
}

function showSetNodeModal(pointrId) {
    const data = pointrData.get(pointrId);
    if (!data) return;
    
    const currentStreets = data.streets || [];
    const availableStreets = getStreetsNearPoint(data.lat, data.lon, 0.8);
    
    let tableHTML = `<table class="node-streets-table">
        <thead>
            <tr>
                <th>Street ID</th>
                <th>Street Name</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody id="nodeStreetsBody">`;
    
    currentStreets.forEach((streetId, index) => {
        const street = availableStreets.find(s => s.id === streetId);
        const streetName = street ? street.name : 'Unknown';
        tableHTML += `<tr data-street-id="${streetId}">
            <td>${streetId}</td>
            <td>${streetName}</td>
            <td><button type="button" class="btn-remove-street" data-index="${index}">Delete</button></td>
        </tr>`;
    });
    
    tableHTML += `</tbody></table>`;
    
    const streetsOptions = availableStreets.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    
    openModal(`
        <div class="modal-content">
            <h2>Set Node Streets</h2>
            <div id="nodeStreetsContainer">
                ${tableHTML}
            </div>
            <div class="form-group" style="margin-top: 15px;">
                <label for="newStreetSelect">Add Street <span class="required">*</span>
                    <select id="newStreetSelect">
                        <option value="">Select a street</option>
                        ${streetsOptions}
                    </select>
                </label>
                <button type="button" class="btn-add-street" style="margin-top: 8px;">Add Row</button>
            </div>
            <div class="modal-error" id="modalError"></div>
            <div class="modal-actions">
                <button type="button" class="btn-cancel" onclick="closeModal()">Huỷ</button>
                <button type="button" class="btn-submit" id="nodeStreetsSave">Lưu</button>
            </div>
        </div>
    `);
    
    // Handle delete buttons
    document.querySelectorAll('.btn-remove-street').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.target.closest('tr').remove();
        });
    });
    
    // Handle add button
    document.querySelector('.btn-add-street').addEventListener('click', (e) => {
        e.preventDefault();
        const select = document.getElementById('newStreetSelect');
        const streetId = parseInt(select.value);
        
        if (!streetId) {
            document.getElementById('modalError').textContent = 'Vui lòng chọn một street.';
            return;
        }
        
        const tbody = document.getElementById('nodeStreetsBody');
        const street = availableStreets.find(s => s.id === streetId);
        const newIndex = currentStreets.length;
        
        const row = document.createElement('tr');
        row.setAttribute('data-street-id', streetId);
        row.innerHTML = `
            <td>${streetId}</td>
            <td>${street.name}</td>
            <td><button type="button" class="btn-remove-street" data-index="${newIndex}">Delete</button></td>
        `;
        
        tbody.appendChild(row);
        currentStreets.push(streetId);
        
        // Attach delete handler to new button
        row.querySelector('.btn-remove-street').addEventListener('click', (e) => {
            e.preventDefault();
            row.remove();
        });
        
        select.value = '';
        document.getElementById('modalError').textContent = '';
    });
    
    // Handle save
    document.getElementById('nodeStreetsSave').addEventListener('click', (e) => {
        e.preventDefault();
        const rows = document.querySelectorAll('#nodeStreetsBody tr');
        const newStreets = [];
        
        rows.forEach(row => {
            const streetId = parseInt(row.getAttribute('data-street-id'));
            if (streetId) newStreets.push(streetId);
        });
        
        data.streets = newStreets;

        // Update tooltip to reflect new street names
        const tooltip = data.element ? data.element.querySelector('.pointr-tooltip') : null;
        if (tooltip) {
            const names = newStreets
                .map(sid => (typeof allStreetsData !== 'undefined' ? allStreetsData : []).find(s => s.id === sid)?.name)
                .filter(Boolean);
            tooltip.textContent = names.join(' - ') || tooltip.textContent;
        }

        closeModal();
    });
}

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

// ==================== SAVE ALL / SUMMARY MODAL ====================

function showSaveAllModal() {
    // Collect unique pointrs — each appears once, carrying its full streets array
    const pointrsList = [];
    pointrData.forEach((data) => {
        const streets = Array.isArray(data.streets)
            ? data.streets.filter(sid => {
                if (typeof allStreetsData !== 'undefined' && Array.isArray(allStreetsData)) {
                    return !!allStreetsData.find(s => s.id === sid);
                }
                return true;
            })
            : [];
        if (streets.length === 0) return; // skip pointrs not linked to any known street
        const tooltip = data.element ? data.element.querySelector('.pointr-tooltip') : null;
        const name = tooltip ? tooltip.textContent
            : (data.lat != null ? `${data.lat.toFixed(6)}, ${data.lon.toFixed(6)}` : `Pointr ${data.id}`);
        pointrsList.push({ id: data.id, name, lat: data.lat, lon: data.lon, streets, dbId: data.dbId || null });
    });

    // Edited POIs queued for bulk update (poi.js owns this list)
    const poisList = (typeof getEditedPoisForSave === 'function') ? getEditedPoisForSave() : [];

    if (pointrsList.length === 0 && poisList.length === 0) {
        openModal(`
            <div class="modal-content">
                <h2>Save Pointrs</h2>
                <div class="modal-context">Không có Pointr/POI nào cần lưu.</div>
                <div class="modal-actions">
                    <button type="button" class="btn-cancel" onclick="closeModal()">Đóng</button>
                </div>
            </div>
        `);
        return;
    }

    let html = `<div class="modal-content"><h2>Save Pointrs</h2>`;

    if (pointrsList.length > 0) {
        html += `<div class="modal-context">Pointrs (${pointrsList.length}):</div><ul style="margin:8px 0 0 18px;font-size:12px;">`;
        pointrsList.forEach(pt => {
            const streetNames = pt.streets
                .map(sid => (typeof allStreetsData !== 'undefined' ? allStreetsData : []).find(s => s.id === sid)?.name)
                .filter(Boolean).join(' - ');
            html += `<li style="margin:4px 0">${escapeHtml(pt.name)} <span style="color:#777;font-size:11px;margin-left:6px">[${escapeHtml(streetNames)}]</span> <span style="color:#777;font-size:11px;margin-left:6px">(#${pt.id}${pt.dbId ? ' ✏️ update' : ' 🆕 new'})</span></li>`;
        });
        html += `</ul>`;
    }

    if (poisList.length > 0) {
        html += `<div class="modal-context" style="margin-top:12px;">POIs (${poisList.length}):</div><ul style="margin:8px 0 0 18px;font-size:12px;">`;
        poisList.forEach(p => {
            html += `<li style="margin:4px 0">${escapeHtml(p.name || ('POI #' + p.poi_id))} <span style="color:#777;font-size:11px;margin-left:6px">[${p.lat.toFixed(6)}, ${p.long.toFixed(6)}]</span> <span style="color:#777;font-size:11px;margin-left:6px">(#${p.poi_id} ✏️ update)</span></li>`;
        });
        html += `</ul>`;
    }

    html += `<div class="modal-error" id="modalError" style="margin-top:8px;"></div>`;
    html += `<div class="modal-actions"><button type="button" class="btn-cancel" onclick="closeModal()">Đóng</button><button type="button" class="btn-submit" id="confirmSaveAll">Confirm</button></div></div>`;

    openModal(html);

    // Attach Confirm handler
    document.getElementById('confirmSaveAll').addEventListener('click', async (e) => {
        e.preventDefault();
        const confirmBtn = document.getElementById('confirmSaveAll');
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Saving...';

        // payload: [{lat, lon, streets: [...], pos_id?}] — one entry per unique position
        const payload = pointrsList
            .filter(p => typeof p.lat === 'number' && !isNaN(p.lat) && typeof p.lon === 'number' && !isNaN(p.lon))
            .map(p => {
                const pt = { lat: p.lat, lon: p.lon, streets: p.streets };
                if (p.dbId) pt.pos_id = p.dbId;
                return pt;
            });

        console.log('positions bulk payload:', JSON.stringify(payload));

        try {
            const _apiBaseBulk = location.hostname === 'localhost' ? 'http://localhost:4000/api' : '/api';

            // 1) Save pointrs (if any)
            if (payload.length > 0) {
                const resp = await fetch(`${_apiBaseBulk}/positions/bulk`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-API-Key': sessionStorage.getItem('admin_api_key') || '' },
                    body: JSON.stringify(payload)
                });
                if (!resp.ok) {
                    const txt = await resp.text();
                    throw new Error(txt || 'Server error');
                }
                const result = await resp.json();
                const created = result.created || result;

                // Build lat/lon → server row lookup for dbId assignment
                const latLonToServer = new Map();
                if (Array.isArray(created)) {
                    created.forEach(pos => {
                        const lat = parseFloat(pos.lat ?? pos.y);
                        const lon = parseFloat(pos.long ?? pos.x);
                        if (!isNaN(lat) && !isNaN(lon)) {
                            latLonToServer.set(`${lat.toFixed(9)},${lon.toFixed(9)}`, pos);
                        }
                    });
                }

                pointrsList.forEach(pt => {
                    const data = pointrData.get(pt.id);
                    if (!data) return;
                    const key = `${Number(pt.lat).toFixed(9)},${Number(pt.lon).toFixed(9)}`;
                    const pos = latLonToServer.get(key);
                    if (pos) {
                        data.dbId = pos.id;
                        data.streets = Array.isArray(pos.streets) ? pos.streets : (data.streets || []);
                        const sp = streetPointsList.find(p => p.id === pt.id);
                        if (sp) {
                            sp.streetId = data.streets[0] ?? sp.streetId;
                            sp.ban      = pos.ban      ?? sp.ban;
                            sp.speed    = pos.speed    ?? sp.speed;
                            sp.park     = pos.park     ?? sp.park;
                            sp.lane     = pos.lane     ?? sp.lane;
                            sp.toll     = pos.tool     ?? sp.toll;
                            sp.flooding = pos.flooding ?? sp.flooding;
                        }
                    } else if (pt.dbId) {
                        data.dbId = pt.dbId;
                    }

                    if (data.dbId) renderedDbIds.add(data.dbId);
                    pointrReload.set(pt.id, data);
                    pointrData.delete(pt.id);
                    if (data.element) data.element.classList.add('pointr-reload');
                });
            }

            // 2) Save POIs (if any)
            let poiSavedCount = 0;
            if (poisList.length > 0 && typeof savePoisBulk === 'function') {
                const poiRes = await savePoisBulk();
                poiSavedCount = poiRes.saved || 0;
            }

            closeModal();
            const parts = [];
            if (payload.length > 0) parts.push(`${payload.length} pointr(s)`);
            if (poiSavedCount > 0)  parts.push(`${poiSavedCount} POI(s)`);
            alert('Saved ' + (parts.join(' + ') || 'nothing') + ' successfully.');
        } catch (err) {
            console.error(err);
            const errEl = document.getElementById('modalError');
            if (errEl) errEl.textContent = 'Lỗi khi lưu: ' + (err.message || err);
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirm';
        }
    });
}

// ==================== POINTR MOVEMENT ====================

function movePointr(direction) {
    if (!activePointrId) return;
    markPointrAsEdited(activePointrId);
    const data = pointrData.get(activePointrId);
    if (!data) return;
    const step = 0.5;
    switch (direction) {
        case 'ArrowUp':    data.initialClientY -= step; break;
        case 'ArrowDown':  data.initialClientY += step; break;
        case 'ArrowLeft':  data.initialClientX -= step; break;
        case 'ArrowRight': data.initialClientX += step; break;
    }
    const sizePer = parseInt(document.getElementById('sSize').value) / 2400;
    const { lat: newLat, lon: newLon } = pixelToLatLon(data.initialClientX, data.initialClientY, sizePer);
    data.lat = newLat;
    data.lon = newLon;
    updatePointrPositions();
}

function rescalePointrs(oldSize, newSize) {
    if (!oldSize || !newSize || oldSize === newSize) return;
    const ratio = newSize / oldSize;
    const sizePer = newSize / 2400;
    const rescaleEntry = (data) => {
        if (data.lat !== null && data.lon !== null) {
            const pos = latLonToPixel(data.lat, data.lon, sizePer);
            data.initialClientX = pos.left;
            data.initialClientY = pos.top;
        } else {
            data.initialClientX *= ratio;
            data.initialClientY *= ratio;
        }
    };
    pointrData.forEach(rescaleEntry);
    pointrReload.forEach(rescaleEntry);
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

    //use pixelToLatLon to get lat/lon of click position before creating pointr
    const container = document.querySelector('.container');
    const clickX = e.clientX + container.scrollLeft;
    const clickY = e.clientY + container.scrollTop;
    const sizePer = parseInt(document.getElementById('sSize').value) / 2400;
    const { lat, lon } = pixelToLatLon(clickX, clickY, sizePer);
    const streetSelect = document.getElementById('Streets');
    const streetValue = streetSelect.value;
    // If Streets is 'all' but a City and District are selected, prompt to create a new street
    const cityVal = document.getElementById('Cities').value;
    const districtVal = document.getElementById('Districts').value;
    if (streetValue === 'all' && cityVal && cityVal !== 'all' && parseInt(cityVal) > 0 && districtVal && districtVal !== 'all' && parseInt(districtVal) > 0) {
        // Create a temporary pointr now so user sees the marker immediately.
        const { pointr, pointrId } = createPointr(clickX, clickY, 'Tạm', lat, lon);
        // mark as temporary so UI can indicate it's pending street assignment
        pointr.classList.add('pointr-temp');
        document.querySelector('.coordinates').appendChild(pointr);
        refreshStreetPath();

        // Open create-street modal; when new street is created, assign it to this pointr
        showCreateStreetModal((newStreetId) => {
            try { document.getElementById('Streets').value = newStreetId; } catch (e) {}
            const streetName = document.getElementById('Streets').selectedOptions[0]?.text || 'New Street';
            const data = pointrData.get(pointrId);
            if (data) {
                data.streets = [parseInt(newStreetId)];
                const tooltip = data.element ? data.element.querySelector('.pointr-tooltip') : null;
                if (tooltip) tooltip.textContent = streetName;
            }
            const sp = streetPointsList.find(p => p.id === pointrId);
            if (sp) sp.streetId = parseInt(newStreetId);
            pointr.classList.remove('pointr-temp');
            refreshStreetPath();
        }, () => {
            // User cancelled → remove the temp pointr
            deletePointr(pointrId);
        });
        return;
    }

    const streetName = streetSelect.options[streetSelect.selectedIndex]?.text || 'Unknown Street';
    const { pointr } = createPointr(clickX, clickY, streetName , lat, lon);
    document.querySelector('.coordinates').appendChild(pointr);
    refreshStreetPath();
}

// ==================== INIT ====================

function initGalleryClickListener() {
    document.querySelector('.gallery').addEventListener('click', handleGalleryClick);
}

function initPathSvg() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'street-path-svg';
    svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:49;overflow:visible;';
    document.querySelector('.coordinates').appendChild(svg);
}

function initContainerScrollListener() {
    document.querySelector('.container').addEventListener('scroll', updatePointrPositions);
}

function initKeyboardListener() {
    document.addEventListener('keydown', (e) => {
        // Skip if focus is inside an input/textarea/select
        const tag = document.activeElement?.tagName;
        const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

        if (!inInput) {
            // N -> Create Point
            if (e.key === 'n' || e.key === 'N') {
                const ed = document.getElementById('editor');
                ed.value = 'create'; ed.dispatchEvent(new Event('change'));
                e.preventDefault();
                return;
            }
            // M -> Move Point
            if (e.key === 'm' || e.key === 'M') {
                const ed = document.getElementById('editor');
                ed.value = 'move'; ed.dispatchEvent(new Event('change'));
                e.preventDefault();
                return;
            }
            // V -> toggle View All Street Paths (sIsStreetPath)
            if (e.key === 'v' || e.key === 'V') {
                const cb = document.getElementById('sIsStreetPath');
                if (cb) { cb.checked = !cb.checked; refreshStreetPath(); }
                e.preventDefault();
                return;
            }
            // B -> toggle Street Panel
            if (e.key === 'b' || e.key === 'B') {
                document.getElementById('streetPanelToggle')?.click();
                e.preventDefault();
                return;
            }
            // T -> reset Streets dropdown to "all"
            if (e.key === 't' || e.key === 'T') {
                const sel = document.getElementById('Streets');
                if (sel) { sel.value = 'all'; sel.dispatchEvent(new Event('change')); }
                e.preventDefault();
                return;
            }
            // + / - -> increase / decrease tile size by 50px
            if (e.key === '+' || e.key === '=') {
                const sl = document.getElementById('sSize');
                if (sl) { sl.value = parseInt(sl.value) + 50; sl.dispatchEvent(new Event('change')); }
                e.preventDefault();
                return;
            }
            if (e.key === '-' || e.key === '_') {
                const sl = document.getElementById('sSize');
                if (sl) { sl.value = Math.max(50, parseInt(sl.value) - 50); sl.dispatchEvent(new Event('change')); }
                e.preventDefault();
                return;
            }
            // < / > -> decrease / increase opacity by 5
            if (e.key === '<' || e.key === ',') {
                const sl = document.getElementById('sOpacity');
                if (sl) { sl.value = Math.max(0, parseInt(sl.value) - 5); sl.dispatchEvent(new Event('input')); }
                e.preventDefault();
                return;
            }
            if (e.key === '>' || e.key === '.') {
                const sl = document.getElementById('sOpacity');
                if (sl) { sl.value = Math.min(100, parseInt(sl.value) + 5); sl.dispatchEvent(new Event('input')); }
                e.preventDefault();
                return;
            }
        }

        // Ctrl+S -> Save All modal
        if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            showSaveAllModal();
            return;
        }

        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            const editor = document.querySelector('#editor');
            if (editor.value === 'move' && activePointrId) {
                movePointr(e.key);
                e.preventDefault();
            } else if (editor.value === 'move'
                       && typeof activePoiId !== 'undefined' && activePoiId != null
                       && typeof movePoi === 'function') {
                movePoi(e.key);
                e.preventDefault();
            }
        }
        if (e.key === 'Delete' && selectedPointrIds.size > 0) {
            const toDelete = [...selectedPointrIds];
            selectedPointrIds.clear();
            toDelete.forEach(pid => deletePointr(pid));
            e.preventDefault();
        }
    }, true);
}

function initPointrDrag() {
    document.addEventListener('mousemove', (e) => {
        if (!isDragging || activePointrId === null) return;
        markPointrAsEdited(activePointrId);
        const data = pointrData.get(activePointrId);
        if (!data) { isDragging = false; return; }
        const container = document.querySelector('.container');
        data.initialClientX = e.clientX + container.scrollLeft;
        data.initialClientY = e.clientY + container.scrollTop;
        const sizePer = parseInt(document.getElementById('sSize').value) / 2400;
        const { lat: newLat, lon: newLon } = pixelToLatLon(data.initialClientX, data.initialClientY, sizePer);
        data.lat = newLat;
        data.lon = newLon;
        data.element.style.left = e.clientX + 'px';
        data.element.style.top = e.clientY + 'px';
    });
    document.addEventListener('mouseup', () => { isDragging = false; });
    document.addEventListener('click', (e) => {
        if (submenuEl && !submenuEl.contains(e.target)) closePointrSubmenu();
    });
}

const _EDITOR_CURSORS = { create: 'crosshair', move: 'all-scroll', view: 'default' };

function _applyEditorCursor(mode) {
    document.querySelector('.container').style.cursor = _EDITOR_CURSORS[mode] || 'default';
}

function initEditorListener() {
    const editor = document.getElementById('editor');
    editor.addEventListener('change', (e) => {
        document.body.className = `mode-${e.target.value}`;
        _applyEditorCursor(e.target.value);
        activePointrId = null;
        updateActivePointrVisual();
        if (typeof activePoiId !== 'undefined') {
            activePoiId = null;
            if (typeof updateActivePoiVisual === 'function') updateActivePoiVisual();
        }
    });
    // Apply initial cursor on load
    _applyEditorCursor(editor.value);
    // Also set body class so CSS mode-specific selectors apply on first render
    document.body.className = `mode-${editor.value}`;
}
