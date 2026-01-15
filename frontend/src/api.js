import axios from 'axios';

const API_URL = 'http://localhost:8000'; // Adjust if your Django port differs

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to inject the token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

export const endpoints = {
    login: '/auth/jwt/create/',
    register: '/auth/users/',
    activate: '/auth/users/activation/',
    resetPassword: '/auth/users/reset_password/',
    resetPasswordConfirm: '/auth/users/reset_password_confirm/',
    tournaments: '/api/tournaments/',
    tournamentDetail: (id) => `/api/tournaments/${id}/`,
    join: (id) => `/api/tournaments/${id}/join/`,
    start: (id) => `/api/tournaments/${id}/start/`,
    report: (tId, mId) => `/api/tournaments/${tId}/matches/${mId}/report/`,
};

export default api;