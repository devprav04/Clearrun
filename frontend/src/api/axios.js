import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        _clearAndRedirect();
        return Promise.reject(error);
      }
      if (!refreshPromise) {
        refreshPromise = axios
          .post((import.meta.env.VITE_API_URL || '/api/') + 'auth/token/refresh/', { refresh: refreshToken })
          .then(r => {
            localStorage.setItem('access_token', r.data.access);
            return r.data.access;
          })
          .catch(() => {
            _clearAndRedirect();
            return null;
          })
          .finally(() => { refreshPromise = null; });
      }
      const newToken = await refreshPromise;
      if (!newToken) return Promise.reject(error);
      original._retry = true;
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    }
    return Promise.reject(error);
  }
);

function _clearAndRedirect() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

export default api;
