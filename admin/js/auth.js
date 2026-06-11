(function () {
    const key = sessionStorage.getItem('admin_api_key');
    if (!key) {
        const redirect = encodeURIComponent(location.href);
        window.location.replace('login.html?redirect=' + redirect);
    }
})();
