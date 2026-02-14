import axios from 'axios';

const API = axios.create(
    {
        baseURL: import.meta.env.backendurl
    }
);

export default API;