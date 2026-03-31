import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// REPLACE WITH YOUR LOCAL IP OR CLOUD RUN URL
const API_URL = 'https://ais-dev-tzo4734p3d7hdrlrudgipn-592781655853.us-east1.run.app';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
