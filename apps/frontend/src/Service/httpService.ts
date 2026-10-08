// src/Services/httpService.ts

import axios from 'axios';
import { BASE_URL } from '../config/urls';

const http = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const fullUrl = error.config?.url || '';
    const normalizedUrl = fullUrl.replace(BASE_URL, '');

    if (status === 401 && normalizedUrl === '/auth/me') {
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default http;
