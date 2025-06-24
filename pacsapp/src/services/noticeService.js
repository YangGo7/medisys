import axios from 'axios';

const API_BASE_URL = 'http://35.225.63.41:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const noticeService = {
  // 시스템 공지사항 조회
  getSystemNotices: async () => {
    try {
      const response = await api.get('/notices/common/');
      return response.data;
    } catch (error) {
      console.error('Error fetching system notices:', error);
      throw error;
    }
  },

  // RIS 공지사항 조회
  getRISNotices: async () => {
    try {
      const response = await api.get('/notices/ris/');
      return response.data;
    } catch (error) {
      console.error('Error fetching RIS notices:', error);
      throw error;
    }
  },
};