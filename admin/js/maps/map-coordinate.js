// =========================
// CONFIG map-coordinate.js
// =========================
// Tile-center interpolation — mỗi tile có center lat/lon chính xác từ
// url_index.txt, dùng làm anchor để tính offset sub-tile → giảm tối đa sai số.
//
// Grid: 23 cols × 42 rows = 966 tiles, mỗi tile 2400×1442 px native.
// url_index.txt format:  idx;lat;lon  (center của tile, 1-indexed)
//
// Tại sao ít sai số hơn:
//   Cũ: anchor top-left → offset tích lũy 42 hàng → ~0.0015° (~165m)
//   Mới: anchor center tile hiện tại (ground-truth) → offset ≤ nửa tile → <5m

const _TC_COLS = 23;
const _TC_ROWS = 42;
const _TC_TW   = 2400;   // tile width  (native px)
const _TC_TH   = 1442;   // tile height (native px)

// Global-average lat/lon per pixel (dùng để ước lượng tile + fallback)
// lat step ≈ 0.0075633°/row ÷ 1442 px ≈ 5.245e-6 °/px
// lon step ≈ 0.0128531°/col ÷ 2400 px ≈ 5.355e-6 °/px
const _AVG_LAT_PP = 5.245e-6;
const _AVG_LON_PP = 5.355e-6;

// _tileCenters[idx] = {lat, lon}, 1-indexed (idx 1..966)
window._tileCenters = null;

// ── Loader ──────────────────────────────────────────────────────────────────
window.loadTileCenters = async function () {
    if (window._tileCenters) return;
    try {
        const res  = await fetch('url_index.txt');
        const text = await res.text();
        const centers = new Array(_TC_COLS * _TC_ROWS + 2);
        text.trim().split('\n').forEach(line => {
            const p = line.trim().split(';');
            if (p.length < 3) return;
            const idx = parseInt(p[0], 10);
            const lat = parseFloat(p[1]);
            const lon = parseFloat(p[2]);
            if (!isNaN(idx) && !isNaN(lat) && !isNaN(lon) &&
                idx >= 1 && idx <= _TC_COLS * _TC_ROWS) {
                centers[idx] = { lat, lon };
            }
        });
        window._tileCenters = centers;
        console.log('[map-coordinate] Loaded', _TC_COLS * _TC_ROWS,
                    'tile centers from url_index.txt');
    } catch (e) {
        console.warn('[map-coordinate] Cannot load url_index.txt — using fallback.', e);
    }
};

// Bắt đầu fetch ngay khi script load (fire-and-forget)
window.loadTileCenters();

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Center {lat,lon} của tile tại display (row, col) — 0-indexed */
function _tc(row, col) {
    row = Math.max(0, Math.min(_TC_ROWS - 1, row));
    col = Math.max(0, Math.min(_TC_COLS - 1, col));
    return window._tileCenters[row * _TC_COLS + col + 1] || { lat: 0, lon: 0 };
}

/**
 * Lat/lon per pixel cục bộ cho tile (row, col).
 * Dùng center-to-center distance của tiles kề bên.
 * Nếu tile irregular (cuối map), clamp về global average.
 */
function _localScale(row, col) {
    let latPerPx, lonPerPx;

    if (row > 0 && row < _TC_ROWS - 1) {
        latPerPx = (_tc(row - 1, col).lat - _tc(row + 1, col).lat) / (2 * _TC_TH);
    } else if (row === 0) {
        latPerPx = (_tc(0, col).lat - _tc(1, col).lat) / _TC_TH;
    } else {
        latPerPx = (_tc(_TC_ROWS - 2, col).lat - _tc(_TC_ROWS - 1, col).lat) / _TC_TH;
    }

    if (col > 0 && col < _TC_COLS - 1) {
        lonPerPx = (_tc(row, col + 1).lon - _tc(row, col - 1).lon) / (2 * _TC_TW);
    } else if (col === 0) {
        lonPerPx = (_tc(row, 1).lon - _tc(row, 0).lon) / _TC_TW;
    } else {
        lonPerPx = (_tc(row, _TC_COLS - 1).lon - _tc(row, _TC_COLS - 2).lon) / _TC_TW;
    }

    // Clamp nếu tile irregular làm scale lệch > 3×
    if (latPerPx < _AVG_LAT_PP * 0.3 || latPerPx > _AVG_LAT_PP * 3) latPerPx = _AVG_LAT_PP;
    if (lonPerPx < _AVG_LON_PP * 0.3 || lonPerPx > _AVG_LON_PP * 3) lonPerPx = _AVG_LON_PP;

    return { latPerPx, lonPerPx };
}

// ── Fallback tuyến tính (trước khi url_index.txt load xong) ─────────────────
const _FB_TL_LAT = 10.947849, _FB_TL_LON = 106.532560;
const _FB_BR_LAT = 10.940261, _FB_BR_LON = 106.545442;

function _fallbackPixelToLatLon(left, top, scale) {
    const lonPP = (_FB_BR_LON - _FB_TL_LON) / _TC_TW;
    const latPP = (_FB_TL_LAT - _FB_BR_LAT) / _TC_TH;
    const nx = (left + 1) / scale, ny = (top + 1) / scale;
    return { lat: _FB_TL_LAT - ny * latPP, lon: _FB_TL_LON + nx * lonPP };
}

function _fallbackLatLonToPixel(lat, lon, scale) {
    const lonPP = (_FB_BR_LON - _FB_TL_LON) / _TC_TW;
    const latPP = (_FB_TL_LAT - _FB_BR_LAT) / _TC_TH;
    return {
        left: (((lon - _FB_TL_LON) / lonPP) * scale) - 1,
        top:  (((_FB_TL_LAT - lat) / latPP) * scale) - 1,
    };
}

// ══════════════════════════════════════════════════════════════════════════════
//  pixelToLatLon
//
//  1. Native px: undo scale + 1px offset
//  2. Floor-divide → xác định tile nào đang click (display row/col)
//  3. Anchor = center lat/lon của tile (ground-truth từ url_index.txt)
//  4. Sub-tile offset (native px từ center) × local scale → delta lat/lon
// ══════════════════════════════════════════════════════════════════════════════
window.pixelToLatLon = function (left, top, scale) {
    scale = scale || 1;
    if (!window._tileCenters) return _fallbackPixelToLatLon(left, top, scale);

    const nx = (left + 1) / scale;
    const ny = (top  + 1) / scale;

    const col = Math.max(0, Math.min(_TC_COLS - 1, Math.floor(nx / _TC_TW)));
    const row = Math.max(0, Math.min(_TC_ROWS - 1, Math.floor(ny / _TC_TH)));

    const cx     = (col + 0.5) * _TC_TW;
    const cy     = (row + 0.5) * _TC_TH;
    const center = _tc(row, col);
    const { latPerPx, lonPerPx } = _localScale(row, col);

    const dx = nx - cx;   // native px, + = đông
    const dy = ny - cy;   // native px, + = nam

    return {
        lat: center.lat - dy * latPerPx,
        lon: center.lon + dx * lonPerPx,
    };
};

// ══════════════════════════════════════════════════════════════════════════════
//  latLonToPixel
//
//  1. Ước lượng display tile từ tile #1 center + global-average scale
//  2. Tìm kiếm 3×3 window → tile center gần nhất với (lat, lon)
//  3. Anchor + sub-tile offset → scaled pixel
// ══════════════════════════════════════════════════════════════════════════════
window.latLonToPixel = function (lat, lon, scale) {
    scale = scale || 1;
    if (!window._tileCenters) return _fallbackLatLonToPixel(lat, lon, scale);

    // 1. Ước lượng từ tile #1 center
    const c1        = window._tileCenters[1];
    const approxRow = Math.round((c1.lat - lat) / (_AVG_LAT_PP * _TC_TH));
    const approxCol = Math.round((lon - c1.lon) / (_AVG_LON_PP * _TC_TW));

    // 2. Tìm tile center gần nhất trong 3×3 window
    let bestRow = Math.max(0, Math.min(_TC_ROWS - 1, approxRow));
    let bestCol = Math.max(0, Math.min(_TC_COLS - 1, approxCol));
    let bestDist = Infinity;

    const rMin = Math.max(0, approxRow - 1), rMax = Math.min(_TC_ROWS - 1, approxRow + 1);
    const cMin = Math.max(0, approxCol - 1), cMax = Math.min(_TC_COLS - 1, approxCol + 1);
    for (let r = rMin; r <= rMax; r++) {
        for (let c = cMin; c <= cMax; c++) {
            const t = _tc(r, c);
            const d = (lat - t.lat) ** 2 + (lon - t.lon) ** 2;
            if (d < bestDist) { bestDist = d; bestRow = r; bestCol = c; }
        }
    }

    // 3. Anchor + sub-tile offset → scaled pixel
    const center = _tc(bestRow, bestCol);
    const { latPerPx, lonPerPx } = _localScale(bestRow, bestCol);

    const dx = (lon - center.lon) / lonPerPx;   // native px, + = đông
    const dy = (center.lat - lat) / latPerPx;   // native px, + = nam

    const cx = (bestCol + 0.5) * _TC_TW;
    const cy = (bestRow + 0.5) * _TC_TH;

    return {
        left: (cx + dx) * scale - 1,
        top:  (cy + dy) * scale - 1,
    };
};