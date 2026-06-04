// =========================
// CONFIG map-coordinate.js
// =========================

window.latLonToPixel = function (lat, lon, scale) {
    scale = scale || 1;
    const scaleX = 1;
    const scaleY = 1;
    const topLeftLat = 10.947849;
    const topLeftLon = 106.532560;

    const bottomRightLat = 10.940296;
    const bottomRightLon = 106.545424;

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