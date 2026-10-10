// Optional API URL override, read at runtime before the bundle.
// Left empty: in the LXC container the build already has VITE_API_URL=/api (nginx proxies
// /api to the backend) and in development .env.local applies. Only useful for
// pointing an existing build at another API without rebuilding it.
window.__ENV__ = {};
