// Sobreposição opcional do URL da API, lida em runtime antes do bundle.
// Fica vazio: no container LXC o build já leva VITE_API_URL=/api (o nginx faz proxy
// de /api para o backend) e em desenvolvimento vale o .env.local. Só serve para
// apontar um build já feito para outra API sem o recompilar.
window.__ENV__ = {};
