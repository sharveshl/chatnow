import axios from 'axios';

const API = axios.create(
    {
        baseURL: import.meta.env.VITE_backendurl
    }
);

export default API;