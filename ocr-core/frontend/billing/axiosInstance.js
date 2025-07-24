import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://192.168.100.252:8000", // prilagodi po potrebi
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export default axiosInstance;
