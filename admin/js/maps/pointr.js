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
        const resp = await fetch('/api/positions', { headers: { 'X-API-Key': sessionStorage.getItem('admin_api_key') || '' } });
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
}

// ==================== STREET PATH ====================

function collectStreetPointrs(streetId) {
    const pts = [];
    pointrReload.forEach(d => { if (Array.isArray(d.streets) && d.streets.includes(streetId)) pts.push(d); });
    pointrData.forEach(d => {   if (Array.isArray(d.streets) && d.streets.includes(streetId)) pts.push(d); });
    return pts;
}

function nearestNeighborSort(pts) {
    if (pts.length <= 1) return [...pts];
    const rem = [...pts];
    // Start from the leftmost point (smallest X) for consistent direction
    let startIdx = 0;
    for (let i = 1; i < rem.length; i++) {
        if (rem[i].initialClientX < rem[startIdx].initialClientX ||
            (rem[i].initialClientX === rem[startIdx].initialClientX && rem[i].initialClientY < rem[startIdx].initialClientY)) {
            startIdx = i;
        }
    }
    const result = [];
    let cur = rem.splice(startIdx, 1)[0];
    result.push(cur);
    while (rem.length > 0) {
        let minD = Infinity, minI = 0;
        for (let i = 0; i < rem.length; i++) {
            const dx = rem[i].initialClientX - cur.initialClientX;
            const dy = rem[i].initialClientY - cur.initialClientY;
            const d = dx * dx + dy * dy;
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

function refreshStreetPath() {
    const svg = document.getElementById('street-path-svg');
    if (!svg) return;
    svg.innerHTML = '';
    if (!activeStreetPathId) return;
    const pts = collectStreetPointrs(activeStreetPathId);
    if (pts.length < 2) return;
    const sorted = nearestNeighborSort(pts);
    const container = document.querySelector('.container');
    const sl = container.scrollLeft;
    const st = container.scrollTop;
    const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    polyline.setAttribute('points', sorted.map(d => `${d.initialClientX - sl},${d.initialClientY - st}`).join(' '));
    polyline.setAttribute('fill', 'none');
    polyline.setAttribute('stroke', '#2196F3');
    polyline.setAttribute('stroke-width', '2');
    polyline.setAttribute('stroke-dasharray', '6,3');
    polyline.setAttribute('opacity', '0.8');
    svg.appendChild(polyline);
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
            fetch(`/api/positions/${data.dbId}/cascade`, { method: 'DELETE', headers: { 'X-API-Key': sessionStorage.getItem('admin_api_key') || '' } })
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

function _haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function _nearbyStreetIds(centerLat, centerLon, radiusKm = 10) {
    const streetIds = new Set();
    const check = (d) => {
        if (d.lat == null || d.lon == null) return;
        if (_haversineKm(centerLat, centerLon, d.lat, d.lon) <= radiusKm) {
            (d.streets || []).forEach(sid => streetIds.add(sid));
        }
    };
    pointrData.forEach(check);
    pointrReload.forEach(check);
    return streetIds;
}

function showSetNodeModal(pointrId) {
    const data = pointrData.get(pointrId) || pointrReload.get(pointrId);
    if (!data) return;
    
    const currentStreets = [...(data.streets || [])];
    const allStreets = allStreetsData || [];

    // Build street options from nearby pointrs (r=10km) instead of all streets
    const nearbyIds = (data.lat != null && data.lon != null)
        ? _nearbyStreetIds(data.lat, data.lon, 10)
        : null;
    const availableStreets = nearbyIds
        ? allStreets.filter(s => nearbyIds.has(s.id) || currentStreets.includes(s.id))
        : allStreets;

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
        const street = allStreets.find(s => s.id === streetId);
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
        const street = allStreets.find(s => s.id === streetId);
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

    if (pointrsList.length === 0) {
        openModal(`
            <div class="modal-content">
                <h2>Save Pointrs</h2>
                <div class="modal-context">Không có Pointr nào cần lưu (hoặc chưa được gán street).</div>
                <div class="modal-actions">
                    <button type="button" class="btn-cancel" onclick="closeModal()">Đóng</button>
                </div>
            </div>
        `);
        return;
    }

    let html = `<div class="modal-content"><h2>Save Pointrs</h2><div class="modal-context">Danh sách Pointr sẽ được lưu:</div><ul style="margin:8px 0 0 18px;font-size:12px;">`;
    pointrsList.forEach(pt => {
        const streetNames = pt.streets
            .map(sid => (typeof allStreetsData !== 'undefined' ? allStreetsData : []).find(s => s.id === sid)?.name)
            .filter(Boolean).join(' - ');
        html += `<li style="margin:4px 0">${escapeHtml(pt.name)} <span style="color:#777;font-size:11px;margin-left:6px">[${escapeHtml(streetNames)}]</span> <span style="color:#777;font-size:11px;margin-left:6px">(#${pt.id}${pt.dbId ? ' ✏️ update' : ' 🆕 new'})</span></li>`;
    });
    html += `</ul><div class="modal-actions"><button type="button" class="btn-cancel" onclick="closeModal()">Đóng</button><button type="button" class="btn-submit" id="confirmSaveAll">Confirm</button></div></div>`;

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
        if (payload.length === 0) {
            alert('No valid points to save.');
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirm';
            return;
        }

        try {
            const resp = await fetch('/api/positions/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-API-Key': sessionStorage.getItem('admin_api_key') || '' },
                body: JSON.stringify(payload)
            });
            if (!resp.ok) {
                const txt = await resp.text();
                throw new Error(txt || 'Server error');
            }
            const result = await resp.json();
            // result.created is expected to be an array of created/updated DB rows
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

            // Move ALL saved pointrs from pointrData → pointrReload using pointrsList
            // (pointrsList was captured at modal-open, so its ids are reliable even if server
            //  response lat/lon precision differs)
            pointrsList.forEach(pt => {
                const data = pointrData.get(pt.id);
                if (!data) return; // already moved or deleted

                // Try to update dbId / metadata from server response via lat/lon key
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
                    // Was an update — keep existing dbId
                    data.dbId = pt.dbId;
                }

                if (data.dbId) renderedDbIds.add(data.dbId);
                pointrReload.set(pt.id, data);
                pointrData.delete(pt.id);
                if (data.element) data.element.classList.add('pointr-reload');
            });

            closeModal();
            alert('Saved positions successfully.');
        } catch (err) {
            console.error(err);
            const errEl = document.getElementById('modalError');
            if (errEl) errEl.textContent = 'Lỗi khi lưu: ' + (err.message || err);
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirm';
        }
    });
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
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
        showCreateStreetModal((newStreetId, newStreet) => {
            try { document.getElementById('Streets').value = newStreetId; } catch (e) {}
            const streetName = document.getElementById('Streets').selectedOptions[0]?.text || 'New Street';
            const data = pointrData.get(pointrId);
            if (data) {
                data.streets = [parseInt(newStreetId)];
                const tooltip = data.element ? data.element.querySelector('.pointr-tooltip') : null;
                if (tooltip) tooltip.textContent = streetName;
            }
            // update streetPointsList entry
            const sp = streetPointsList.find(p => p.id === pointrId);
            if (sp) sp.streetId = parseInt(newStreetId);
            // add new street to allStreetsData so showSaveAllModal can find it
            if (newStreet && Array.isArray(allStreetsData) && !allStreetsData.find(s => s.id === newStreet.id)) {
                allStreetsData.push(newStreet);
            }
            // pointr-temp becomes a real pointr ready for Save All
            pointr.classList.remove('pointr-temp');
            refreshStreetPath();
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
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            const editor = document.querySelector('#editor');
            if (editor.value === 'move' && activePointrId) {
                movePointr(e.key);
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

function initEditorListener() {
    const editor = document.getElementById('editor');
    editor.addEventListener('change', (e) => {
        document.body.className = `mode-${e.target.value}`;
        activePointrId = null;
        updateActivePointrVisual();
    });
}
