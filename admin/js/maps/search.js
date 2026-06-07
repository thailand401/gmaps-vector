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

    const resp = await fetch('http://localhost:4000/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    if (resp.warning) html += `<div class="sr-warning">⚠ ${resp.warning}</div>`;
    if (resp.message) html += `<div class="sr-message">${resp.message}</div>`;

    if (Array.isArray(resp.data) && resp.data.length > 0) {
        resp.data.forEach((pt, i) => {
            const streets = Array.isArray(pt.street_names) && pt.street_names.length
                ? pt.street_names.join(' - ')
                : (Array.isArray(pt.streets) ? pt.streets.join(', ') : '-');
            const dist = pt.distance_m != null ? ` <span style="color:#888">~${pt.distance_m}m</span>` : '';
            const query = pt.query_lat != null
                ? `<span style="color:#aaa;font-size:10px"> (query: ${pt.query_lat.toFixed(6)}, ${pt.query_lon.toFixed(6)})</span>`
                : '';
            html += `<div class="sr-point"><b>P${i + 1}</b> #${pt.id ?? '-'} ${streets}${dist}${query}<br><span style="color:#555">${pt.lat}, ${pt.lon}</span></div>`;
        });
    } else {
        html += '<div class="sr-message">Không tìm thấy điểm nào.</div>';
    }

    container.innerHTML = html;
}
