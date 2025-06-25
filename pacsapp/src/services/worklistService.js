// pacsapp/src/services/worklistService.js - API 경로 수정
import axios from 'axios';

const API_BASE_URL = 'http://35.225.63.41:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 에러 응답 인터셉터 추가
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Worklist API Error:', error);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Full URL:', error.config?.url);
    }
    return Promise.reject(error);
  }
);

export const worklistService = {
  // 🔧 워크리스트 조회 - 새로운 Django URL에 맞춤
  getWorklist: async () => {
    try {
      console.log('🔗 Fetching worklist from:', `${API_BASE_URL}/study-requests/worklist/`);
      const response = await api.get('/study-requests/worklist/');
      console.log('✅ Worklist response:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching worklist:', error);
      
      // 404 오류 시 대체 API 시도
      if (error.response?.status === 404) {
        console.log('🔄 Trying alternative API endpoint...');
        try {
          const response = await api.get('/study-requests/');
          console.log('✅ Alternative API response:', response.data);
          return response.data;
        } catch (altError) {
          console.error('❌ Alternative API also failed:', altError);
        }
      }
      
      throw error;
    }
  },

  // 검사 배정
  assignExam: async (examId, assignmentData) => {
    try {
      console.log('Assigning exam:', examId, assignmentData);
      const response = await api.post(`/study-requests/${examId}/assign/`, assignmentData);
      return response.data;
    } catch (error) {
      console.error('Error assigning exam:', error);
      throw error;
    }
  },

  // 검사 시작
  startExam: async (examId) => {
    try {
      const response = await api.post(`/study-requests/${examId}/start_exam/`);
      return response.data;
    } catch (error) {
      console.error('Error starting exam:', error);
      throw error;
    }
  },

  // 검사 완료
  completeExam: async (examId) => {
    try {
      const response = await api.post(`/study-requests/${examId}/complete_exam/`);
      return response.data;
    } catch (error) {
      console.error('Error completing exam:', error);
      throw error;
    }
  },

  // 검사 취소
  cancelExam: async (examId) => {
    try {
      const response = await api.post(`/study-requests/${examId}/cancel_exam/`);
      return response.data;
    } catch (error) {
      console.error('Error canceling exam:', error);
      throw error;
    }
  },

  // 🆕 API 연결 테스트 함수
  testConnection: async () => {
    try {
      console.log('🔍 Testing API connection...');
      
      // 여러 엔드포인트 테스트
      const endpoints = [
        '/study-requests/worklist/',
        '/study-requests/',
        '/health/',
        '/doctors/',
        '/rooms/'
      ];
      
      const results = [];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Testing: ${API_BASE_URL}${endpoint}`);
          const response = await api.get(endpoint);
          results.push({
            endpoint,
            status: 'success',
            code: response.status,
            data: response.data
          });
          console.log(`✅ ${endpoint}: OK`);
        } catch (err) {
          results.push({
            endpoint,
            status: 'error',
            code: err.response?.status || 'Network Error',
            error: err.message
          });
          console.log(`❌ ${endpoint}: ${err.response?.status || 'Network Error'}`);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Connection test failed:', error);
      return [{
        endpoint: 'general',
        status: 'error',
        error: error.message
      }];
    }
  }
};