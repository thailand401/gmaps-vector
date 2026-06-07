// ==================== SETTINGS ====================

async function loadLocations() {
    const res = await fetch('http://localhost:4000/api/map-images');
    const data = await res.json();
    locationsData = data.images.map((src, i) => ({ src, name: `Map ${i + 1}` }));
    filteredLocations = locationsData;
    await loadCities();
    displayLocations(locationsData);
}

function displayLocations(locations) {
    const galleryDiv = document.getElementById('gallery');
    galleryDiv.innerHTML = '';
    const settings = window._gallerySettings || {};
    const noBorder = settings.isBorder === false;

    locations.forEach((location, index) => {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.dataset.index = index;

        item.innerHTML = `
            <div class="image-wrapper">
                <img src="${location.src}" alt="${location.name}" style="${noBorder ? 'border:none;' : ''}">
            </div>
            <div class="image-info">${location.name}</div>
        `;

        galleryDiv.appendChild(item);
    });
}

function initSettings() {
    const btn = document.getElementById('settingsBtn');
    const panel = document.getElementById('settingsPanel');

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) && e.target !== btn) {
            panel.classList.remove('open');
        }
    });

    let _prevSize = parseInt(document.getElementById('sSize').value) || 400;
    window._gallerySettings = {
        items: parseInt(document.getElementById('sItems').value) || 23,
        size: _prevSize,
        isBorder: document.getElementById('sIsBorder').checked,
        opacity: parseInt(document.getElementById('sOpacity').value) ?? 100
    };

    document.getElementById('sOpacity').addEventListener('input', () => {
        const opacity = parseInt(document.getElementById('sOpacity').value) / 100;
        document.getElementById('gallery').style.opacity = opacity;
        if (window._gallerySettings) window._gallerySettings.opacity = parseInt(document.getElementById('sOpacity').value);
    });

    document.getElementById('sSize').addEventListener('change', () => {
        const items = parseInt(document.getElementById('sItems').value) || 23;
        const newSize = parseInt(document.getElementById('sSize').value);
        if (!newSize || newSize < 1) return;
        document.querySelector('.gallery').style.gridTemplateColumns = `repeat(${items}, ${newSize}px)`;
        const oldSize = _prevSize || (window._gallerySettings && window._gallerySettings.size);
        rescalePointrs(oldSize, newSize);
        _prevSize = newSize;
        if (window._gallerySettings) window._gallerySettings.size = newSize;
    });

    document.getElementById('settingsSave').addEventListener('click', () => {
        const items = parseInt(document.getElementById('sItems').value) || 23;
        const newSize = parseInt(document.getElementById('sSize').value) || 400;
        const isBorder = document.getElementById('sIsBorder').checked;
        const opacity = parseInt(document.getElementById('sOpacity').value) / 100;
        const oldSize = _prevSize || (window._gallerySettings && window._gallerySettings.size);

        document.querySelector('.gallery').style.gridTemplateColumns = `repeat(${items}, ${newSize}px)`;

        document.querySelectorAll('.gallery-item img').forEach(img => {
            img.style.border = isBorder ? '' : 'none';
        });
        document.getElementById('gallery').style.opacity = opacity;

        rescalePointrs(oldSize, newSize);
        _prevSize = newSize;
        window._gallerySettings = { items, size: newSize, isBorder, opacity: parseInt(document.getElementById('sOpacity').value) };
        panel.classList.remove('open');
    });
}
