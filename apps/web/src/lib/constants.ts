export const API_BASE_URL = '/api/v1';
export const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://localhost:4000';
export const WS_BASE_URL = API_ORIGIN.replace(/^http/, 'ws');
