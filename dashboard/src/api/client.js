import axios from 'axios';

// Base URL comes from .env — VITE_API_BASE_URL. Falls back to local backend.
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export const client = axios.create({ baseURL });

const TOKEN_KEY = 'kg_access_token';
const REFRESH_KEY = 'kg_refresh_token';

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}
export function setTokens({ accessToken, refreshToken }) {
  if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}
export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// Attach access token + client_type header (backend distinguishes mobile/web).
client.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers.client_type = 'web';
  return config;
});

// On 401, try refreshing the token once, then retry the original request.
// Backend error shape: { success: false, error: { code, message } }
let refreshInFlight = null;

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const code = error.response?.data?.error?.code;

    if (status === 401 && !original._retry && code !== 'REFRESH_TOKEN_INVALID') {
      original._retry = true;
      try {
        if (!refreshInFlight) {
          refreshInFlight = client
            .post('/auth/refresh', { refreshToken: getRefreshToken() })
            .finally(() => {
              refreshInFlight = null;
            });
        }
        const { data } = await refreshInFlight;
        setTokens(data.data);
        original.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return client(original);
      } catch (refreshErr) {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

// Helper to pull a readable message out of the backend's error shape.
export function errorMessage(err, fallback = 'Something went wrong') {
  return err?.response?.data?.error?.message || fallback;
}
