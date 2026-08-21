
import axios from "axios";

const API_BASE = (process.env.FASTAPI_BASE || "http://localhost:8000"

).replace(/\/$/, "");

const api = axios.create({
    baseURL: API_BASE + "/api",
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
})

console.log("API Base URL:", API_BASE);

// helper for multipart requests
export const postMultipart = (path, formData) => {
    return api.post(path, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const putMultipart = (path, formData) => {
    return api.put(path, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export default api;
