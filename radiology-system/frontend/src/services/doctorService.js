import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const doctorService = {
  // 현재 사용자 정보 조회
  getCurrentUser: async () => {
    try {
      const response = await api.get('/doctors/current_user/');
      return response.data;
    } catch (error) {
      console.error('Error fetching current user:', error);
      throw error;
    }
  },

  // 전체 의사 목록 조회
  getAllDoctors: async () => {
    try {
      const response = await api.get('/doctors/');
      return response.data;
    } catch (error) {
      console.error('Error fetching doctors:', error);
      throw error;
    }
  },

  // 🆕 방사선사 목록 조회 (Dashboard용)
  getRadiologists: async () => {
    try {
      const response = await api.get('/doctors/radiologists/');
      return response.data;
    } catch (error) {
      console.error('Error fetching radiologists:', error);
      throw error;
    }
  },

  // 상태
  updateStatus: async (status) => {
    try {
      const response = await api.patch('/doctors/current_user/status/', {
        status: status
      });
      return response.data;
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  },
}; 