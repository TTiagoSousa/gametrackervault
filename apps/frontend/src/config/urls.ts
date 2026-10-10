declare global {
  interface Window {
    __ENV__?: {
      VITE_API_URL?: string;
    };
  }
}

// The API URL comes from the build (VITE_API_URL: "/api" in the LXC container, .env.local in
// development). window.__ENV__ (public/env-config.js) lets you override it at runtime
// without rebuilding; empty by default.
const BASE_URL = window.__ENV__?.VITE_API_URL || import.meta.env.VITE_API_URL;

export { BASE_URL };
