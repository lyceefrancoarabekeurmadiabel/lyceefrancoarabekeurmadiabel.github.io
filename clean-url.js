(function () {
    let path = window.location.pathname;
    if (path.endsWith('index.html')) {
        path = path.replace(/index\.html$/, '');
    } else if (path.endsWith('.html')) {
        path = path.slice(0, -5);
    }
    if (path !== window.location.pathname) {
        window.history.replaceState(null, '', path + window.location.search + window.location.hash);
    }
})();