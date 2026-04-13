import axios from 'axios';

const API = axios.create({
    baseURL: import.meta.env.VITE_backendurl,
    withCredentials: true
});

export default API;