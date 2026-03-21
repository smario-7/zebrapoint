import axios from "axios";
import toast from "react-hot-toast";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
  timeout: 30000
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("zp_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNABORTED") {
      toast.error("Serwer nie odpowiada. Spróbuj ponownie.");
      return Promise.reject(error);
    }

    if (!error.response) {
      toast.error("Brak połączenia. Sprawdź internet.");
      return Promise.reject(error);
    }

    const status = error.response?.status;

    if (status === 401) {
      window.dispatchEvent(new CustomEvent("zp:unauthorized"));
      return Promise.reject(error);
    }

    if (status === 403) {
      toast.error("Brak dostępu do tego zasobu.");
      return Promise.reject(error);
    }

    if (status >= 500) {
      toast.error("Błąd serwera. Spróbuj ponownie za chwilę.");
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;
