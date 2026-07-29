import axios from 'axios';
import { setAuthTokenGetter, setBaseUrl } from '@workspace/api-client-react/custom-fetch';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Also configure the generated client
setBaseUrl('/api');
setAuthTokenGetter(() => localStorage.getItem('token'));

export default api;
