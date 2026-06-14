// ==================== POI STATE ====================
//
// Mirrors the pointr state model:
//   _poiMap        : Map<poiId, { poi, el, initialClientX, initialClientY, lat, long, edited }>
//   _poiEditedIds  : Set<poiId> of POIs with unsaved moves (queued for bulk save)
//   activePoiId    : currently-selected POI (drag / arrow-key target)
//   isDraggingPoi  : true while user is dragging an active POI marker

const _poiMap = new Map();
const _poiEditedIds = new Set();
let activePoiId = null;
let isDraggingPoi = false;

async function loadPois() {
    const _apiBase = location.hostname === 'localhost' ? 'http://localhost:4000/api' : '/api';
    try {
        const res = await fetch(`${_apiBase}/pois`, {
            headers: { 'X-API-Key': sessionStorage.getItem('admin_api_key') || '' }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        _poiMap.clear();
        _poiEditedIds.clear();
        (Array.isArray(data) ? data : []).forEach(p => {
            if (p == null || p.id == null) return;
            _poiMap.set(p.id, {
                poi: p,
                el: null,
                initialClientX: 0,
                initialClientY: 0,
                lat:  p.lat  != null ? Number(p.lat)  : null,
                long: p.long != null ? Number(p.long) : null,
                edited: false,
            });
        });
    } catch (e) {
        console.warn('Failed to load POIs:', e);
    }
}

function _poiLabel(poi) {
    const segs = (poi.name || '').split('|').map(s => s.trim()).filter(Boolean);
    return segs[0] || poi.name || '';
}

function markPoiAsEdited(poiId) {
    const entry = _poiMap.get(poiId);
    if (!entry || entry.edited) return;
    entry.edited = true;
    _poiEditedIds.add(poiId);
    if (entry.el) entry.el.classList.add('poi-edited');
}

function updateActivePoiVisual() {
    document.querySelectorAll('.poi-marker.active').forEach(el => el.classList.remove('active'));
    if (activePoiId != null) {
        const e = _poiMap.get(activePoiId);
        if (e && e.el) e.el.classList.add('active');
    }
}

function _attachPoiInteractions(el, poiId) {
    el.addEventListener('mousedown', (e) => {
        const editor = document.querySelector('#editor');
        if (!editor || editor.value !== 'move') return;
        activePoiId = poiId;
        if (typeof activePointrId !== 'undefined') activePointrId = null;
        updateActivePoiVisual();
        if (typeof updateActivePointrVisual === 'function') updateActivePointrVisual();
        isDraggingPoi = true;
        e.stopPropagation();
        e.preventDefault();
    });
    el.addEventListener('click', (e) => {
        e.stopPropagation();
        const editor = document.querySelector('#editor');
        if (editor && editor.value === 'move') {
            activePoiId = poiId;
            if (typeof activePointrId !== 'undefined') activePointrId = null;
            updateActivePoiVisual();
            if (typeof updateActivePointrVisual === 'function') updateActivePointrVisual();
        }
    });
}

function renderPois() {
    // Detach + remove any existing elements (state is preserved in _poiMap)
    _poiMap.forEach(entry => {
        if (entry.el) { entry.el.remove(); entry.el = null; }
    });

    const show = document.getElementById('sIsPoi')?.checked;
    if (!show || _poiMap.size === 0) return;

    const layer = document.querySelector('.coordinates');
    const container = document.querySelector('.container');
    const sizePer = parseInt(document.getElementById('sSize')?.value || 400) / 2400;
    const sl = container.scrollLeft;
    const st = container.scrollTop;

    _poiMap.forEach((entry, poiId) => {
        const { poi, lat, long } = entry;
        if (lat == null || long == null) return;
        const { left, top } = latLonToPixel(lat, long, sizePer);
        entry.initialClientX = left;
        entry.initialClientY = top;

        const el = document.createElement('div');
        el.className = 'poi-marker';
        el.id = `poi-marker-${poiId}`;
        if (entry.edited) el.classList.add('poi-edited');
        el.style.left = (left - sl) + 'px';
        el.style.top  = (top  - st) + 'px';
        el.innerHTML = `
            <div class="poi-marker-dot"></div>
            <div class="poi-marker-label" title="${escapeHtml(poi.address || poi.name || '')}">${escapeHtml(_poiLabel(poi))}</div>
        `;
        _attachPoiInteractions(el, poiId);
        layer.appendChild(el);
        entry.el = el;
    });
    updateActivePoiVisual();
}

function updatePoiMarkerPositions() {
    if (_poiMap.size === 0) return;
    const container = document.querySelector('.container');
    const sizePer = parseInt(document.getElementById('sSize')?.value || 400) / 2400;
    const sl = container.scrollLeft;
    const st = container.scrollTop;
    _poiMap.forEach(entry => {
        if (!entry.el || entry.lat == null || entry.long == null) return;
        const { left, top } = latLonToPixel(entry.lat, entry.long, sizePer);
        entry.initialClientX = left;
        entry.initialClientY = top;
        entry.el.style.left = (left - sl) + 'px';
        entry.el.style.top  = (top  - st) + 'px';
    });
}

// ==================== POI DRAG / MOVE ====================

function _onPoiMouseMove(e) {
    if (!isDraggingPoi || activePoiId == null) return;
    const entry = _poiMap.get(activePoiId);
    if (!entry) { isDraggingPoi = false; return; }
    markPoiAsEdited(activePoiId);
    const container = document.querySelector('.container');
    entry.initialClientX = e.clientX + container.scrollLeft;
    entry.initialClientY = e.clientY + container.scrollTop;
    const sizePer = parseInt(document.getElementById('sSize')?.value || 400) / 2400;
    const { lat: newLat, lon: newLon } = pixelToLatLon(entry.initialClientX, entry.initialClientY, sizePer);
    entry.lat  = newLat;
    entry.long = newLon;
    if (entry.el) {
        entry.el.style.left = e.clientX + 'px';
        entry.el.style.top  = e.clientY + 'px';
    }
}

function _onPoiMouseUp() { isDraggingPoi = false; }

function movePoi(direction) {
    if (activePoiId == null) return;
    const entry = _poiMap.get(activePoiId);
    if (!entry) return;
    markPoiAsEdited(activePoiId);
    const step = 0.5;
    switch (direction) {
        case 'ArrowUp':    entry.initialClientY -= step; break;
        case 'ArrowDown':  entry.initialClientY += step; break;
        case 'ArrowLeft':  entry.initialClientX -= step; break;
        case 'ArrowRight': entry.initialClientX += step; break;
    }
    const sizePer = parseInt(document.getElementById('sSize')?.value || 400) / 2400;
    const { lat: newLat, lon: newLon } = pixelToLatLon(entry.initialClientX, entry.initialClientY, sizePer);
    entry.lat  = newLat;
    entry.long = newLon;
    updatePoiMarkerPositions();
}

function initPoiInteractions() {
    document.addEventListener('mousemove', _onPoiMouseMove);
    document.addEventListener('mouseup',   _onPoiMouseUp);
}

// ==================== BULK SAVE INTEGRATION ====================

function getEditedPoisForSave() {
    const out = [];
    _poiEditedIds.forEach(id => {
        const entry = _poiMap.get(id);
        if (!entry) return;
        if (entry.lat == null || entry.long == null) return;
        out.push({
            poi_id: id,
            name: entry.poi.name || '',
            lat:  entry.lat,
            long: entry.long,
        });
    });
    return out;
}

async function savePoisBulk() {
    const items = getEditedPoisForSave();
    if (items.length === 0) return { saved: 0 };
    const _apiBase = location.hostname === 'localhost' ? 'http://localhost:4000/api' : '/api';
    const payload = items.map(i => ({ poi_id: i.poi_id, lat: i.lat, long: i.long }));
    const resp = await fetch(`${_apiBase}/pois/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': sessionStorage.getItem('admin_api_key') || '' },
        body: JSON.stringify(payload),
    });
    if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || `POI bulk save failed (${resp.status})`);
    }
    const result = await resp.json();
    // Clear edited markers + sync entry.poi.lat/long with what we just saved
    items.forEach(i => {
        const entry = _poiMap.get(i.poi_id);
        if (!entry) return;
        entry.edited = false;
        if (entry.poi) { entry.poi.lat = i.lat; entry.poi.long = i.long; }
        if (entry.el) entry.el.classList.remove('poi-edited');
    });
    _poiEditedIds.clear();
    return { saved: items.length, result };
}
