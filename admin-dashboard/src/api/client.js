import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const client = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('ridehail_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default client;
