declare global {
  interface Window {
    __ENV__?: {
      VITE_API_URL?: string;
    };
  }
}

// O URL da API vem do build (VITE_API_URL: "/api" no container LXC, o .env.local em
// desenvolvimento). window.__ENV__ (public/env-config.js) permite sobrepô-lo em runtime
// sem recompilar; por omissão está vazio.
const BASE_URL = window.__ENV__?.VITE_API_URL || import.meta.env.VITE_API_URL;

export { BASE_URL };
