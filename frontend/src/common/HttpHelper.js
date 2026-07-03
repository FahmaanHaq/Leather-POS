import axios from 'axios';

/**
 * Reference-only stub matching your existing CommonGet/CommonPost helpers
 * (Axios-based, attaches JWT bearer token, unwraps AgriGenERPResponse-style
 * {status, message, data} shape). Replace with a re-export of the real ones
 * if this project shares a monorepo with your existing frontend.
 */
const apiClient = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL || '/api',
});

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.reload();
        }
        return Promise.reject(error);
    }
);

export const CommonGet = async (url) => {
    try {
        const response = await apiClient.get(url);
        return response.data;
    } catch (error) {
        return { status: false, message: error?.response?.data?.message ?? 'Request failed', data: null };
    }
};

export const CommonPost = async (url, payload) => {
    try {
        const response = await apiClient.post(url, payload);
        return response.data;
    } catch (error) {
        return { status: false, message: error?.response?.data?.message ?? 'Request failed', data: null };
    }
};
