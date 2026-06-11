// =========================
// CONFIG map-coordinate.js
// =========================
//
// Grid:  23 cols × 42 rows = 966 tiles, each 2400×1442 px
// Full extent (from maps.js):
//   topLeft     : 10.947849,  106.532560
//   bottomRight : 10.629144,  106.828837
//
// Per-tile derived values:
//   lat span = (10.947849 - 10.629144) / 42 = 0.00758821°
//   lon span = (106.828837 - 106.532560) / 23 = 0.01288161°
//   → bottomRightLat = 10.947849 - 0.00758821 = 10.94026079
//   → bottomRightLon = 106.532560 + 0.01288161 = 106.54544161
//
// NOTE: If pixel→latLon still drifts, calibrate with a known GPS landmark:
//   correct bottomRightLat = topLeftLat - (topLeftLat - knownLat) / rowIndex
//   correct bottomRightLon = topLeftLon + (knownLon - topLeftLon) / colIndex

window.latLonToPixel = function (lat, lon, scale) {
    scale = scale || 1;
    const scaleX = 1;
    const scaleY = 1;
    const topLeftLat    = 10.947849;
    const topLeftLon    = 106.532560;
    const bottomRightLat = 10.940261;   // was 10.940296 — derived from 42-row grid
    const bottomRightLon = 106.545442;  // was 106.545424 — derived from 23-col grid
    const tileWidth = 2400;
    const tileHeight = 1442;

    const lonPerPixel =
        (bottomRightLon - topLeftLon) /
        tileWidth;
    const latPerPixel =
        (topLeftLat - bottomRightLat) /
        tileHeight;

    return {
        left:
            (((lon - topLeftLon) /
                lonPerPixel) *
            scale) - scaleX,
        top:
            (((topLeftLat - lat) /
                latPerPixel) *
            scale) - scaleY
    };
};

window.pixelToLatLon = function (left, top, scale) {
    scale = scale || 1;

    const scaleX = 1;
    const scaleY = 1;

    const topLeftLat    = 10.947849;
    const topLeftLon    = 106.532560;
    const bottomRightLat = 10.940261;   // was 10.940296 — derived from 42-row grid
    const bottomRightLon = 106.545442;  // was 106.545424 — derived from 23-col grid

    const tileWidth = 2400;
    const tileHeight = 1442;

    const lonPerPixel =
        (bottomRightLon - topLeftLon) /
        tileWidth;

    const latPerPixel =
        (topLeftLat - bottomRightLat) /
        tileHeight;

    // Undo scale và offset
    const x = (left + scaleX) / scale;
    const y = (top + scaleY) / scale;
    const lon =
        topLeftLon +
        (x * lonPerPixel);
    const lat =
        topLeftLat -
        (y * latPerPixel);

    return {
        lat,
        lon
    };
};