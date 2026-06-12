// ==================== SEARCH ====================

function initSearch() {
    const btn    = document.getElementById('searchBtn');
    const modal  = document.getElementById('searchModal');
    const submit = document.getElementById('searchSubmit');
    const result = document.getElementById('searchResult');

    // Toggle modal
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        modal.style.display = modal.style.display === 'none' ? 'block' : 'none';
        if (modal.style.display === 'block') result.innerHTML = '';
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!modal.contains(e.target) && e.target !== btn) {
            modal.style.display = 'none';
        }
    });

    submit.addEventListener('click', async () => {
        const lat1 = parseFloat(document.getElementById('sLat1').value);
        const lon1 = parseFloat(document.getElementById('sLon1').value);
        const lat2 = parseFloat(document.getElementById('sLat2').value);
        const lon2 = parseFloat(document.getElementById('sLon2').value);

        if (isNaN(lat1) || isNaN(lon1)) {
            result.innerHTML = '<div class="sr-warning">Vui lòng nhập ít nhất Lat 1 và Long 1.</div>';
            return;
        }

        submit.disabled = true;
        submit.textContent = 'Searching...';
        result.innerHTML = '';

        try {
            const response = await searchPoints({ lat1, lon1, lat2: isNaN(lat2) ? null : lat2, lon2: isNaN(lon2) ? null : lon2 });
            renderSearchResult(result, response);
        } catch (err) {
            result.innerHTML = `<div class="sr-warning">Lỗi: ${err.message}</div>`;
        } finally {
            submit.disabled = false;
            submit.textContent = 'Search';
        }
    });
}

/**
 * Fake API call — replace with real fetch when backend is ready.
 * Expected response: { data: [...], label: "", warning: "", message: "" }
 */
async function searchPoints({ lat1, lon1, lat2, lon2 }) {
    const points = [{ lat: lat1, lon: lon1 }];
    if (lat2 != null && lon2 != null) points.push({ lat: lat2, lon: lon2 });

    const _apiBase = location.hostname === 'localhost' ? 'http://localhost:4000/api' : '/api';
    const resp = await fetch(`${_apiBase}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': sessionStorage.getItem('admin_api_key') || '' },
        body: JSON.stringify({ points })
    });
    if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || `HTTP ${resp.status}`);
    }
    return resp.json();
}

function renderSearchResult(container, resp) {
    let html = '';
    if (resp.label)   html += `<div class="sr-label">${resp.label}</div>`;
    if (resp.tts)     html += `<div class="sr-tts">${resp.tts}</div>`;
    if (resp.warning) html += `<div class="sr-warning">&#9888; ${resp.warning}</div>`;
    if (resp.message) html += `<div class="sr-message">${resp.message}</div>`;

    // Auto-play TTS audio if tts text provided — call TTS service async, play when ready
    if (resp.tts) {
        const existing = document.getElementById('tts-audio-player');
        if (existing) existing.remove();
        fetch('http://localhost:4020/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: resp.tts })
        })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
            if (!data || !data.url) return;
            const audio = document.createElement('audio');
            audio.id  = 'tts-audio-player';
            audio.src = data.url;
            document.body.appendChild(audio);
            audio.play().catch(() => {});
        })
        .catch(() => {});
    }

    if (Array.isArray(resp.data) && resp.data.length > 0) {
        resp.data.forEach((pt, i) => {
            const streets = Array.isArray(pt.street_names) && pt.street_names.length
                ? pt.street_names.join(' - ')
                : '-';
            const isFirst = i === 0, isLast = i === resp.data.length - 1;
            const marker = isFirst ? '&#9679; Start' : isLast ? '&#9679; End' : `&#9675; ${i + 1}`;
            html += `<div class="sr-point">
                <span class="sr-step">${marker}</span>
                <span class="sr-streets">${streets}</span>
                <span class="sr-coords">${Number(pt.lat).toFixed(6)}, ${Number(pt.lon).toFixed(6)}</span>
            </div>`;
        });
        drawSearchPath(resp.data);
    } else {
        html += '<div class="sr-message">Kh&#244;ng t&#236;m th&#7845;y &#273;i&#7875;m n&#224;o.</div>';
        clearSearchPath();
    }

    container.innerHTML = html;
}

// ── Search path SVG overlay ───────────────────────────────────────────────────

function _getOrCreateSearchSvg() {
    let svg = document.getElementById('search-path-svg');
    if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'search-path-svg';
        svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:50;overflow:visible;';
        const coords = document.querySelector('.coordinates');
        if (coords) coords.appendChild(svg);
    }
    return svg;
}

function clearSearchPath() {
    const svg = document.getElementById('search-path-svg');
    if (svg) svg.innerHTML = '';
}

function drawSearchPath(pathPts) {
    const svg = _getOrCreateSearchSvg();
    svg.innerHTML = '';
    if (!pathPts || pathPts.length < 2) return;

    const mapSize = parseInt(document.getElementById('sSize')?.value) || 400;
    const sizePer = mapSize / 2400;
    const mapContainer = document.querySelector('.container');
    const sl = mapContainer ? mapContainer.scrollLeft : 0;
    const st = mapContainer ? mapContainer.scrollTop  : 0;

    const pts = pathPts.map(p => {
        const px = latLonToPixel(parseFloat(p.lat), parseFloat(p.lon), sizePer);
        return `${px.left - sl},${px.top - st}`;
    }).join(' ');

    // Path line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    line.setAttribute('points', pts);
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', '#FF5722');
    line.setAttribute('stroke-width', '3');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('stroke-linejoin', 'round');
    line.setAttribute('opacity', '0.85');
    svg.appendChild(line);

    // Start & end markers
    const first = pathPts[0],  last = pathPts[pathPts.length - 1];
    [[first, '#4CAF50'], [last, '#F44336']].forEach(([p, color]) => {
        const px = latLonToPixel(parseFloat(p.lat), parseFloat(p.lon), sizePer);
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', px.left - sl);
        c.setAttribute('cy', px.top  - st);
        c.setAttribute('r', '6');
        c.setAttribute('fill', color);
        c.setAttribute('stroke', '#fff');
        c.setAttribute('stroke-width', '2');
        svg.appendChild(c);
    });

    // Redraw on scroll so path stays aligned
    if (mapContainer && !mapContainer._searchScrollBound) {
        mapContainer._searchScrollBound = true;
        mapContainer.addEventListener('scroll', () => drawSearchPath(_lastSearchPath));
    }
    window._lastSearchPath = pathPts;
}

