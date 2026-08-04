import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",
});

// This runs before every single request automatically —
// it attaches the JWT token if one exists, so you don't
// have to manually add it every time you call the API.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// This runs after every response. If the backend says 401
// (token invalid/expired), we auto-log the user out.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;