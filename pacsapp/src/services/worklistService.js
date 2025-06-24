// worklistService.js

import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

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
    }
    return Promise.reject(error);
  }
);

export const worklistService = {
  // 워크리스트 조회
  getWorklist: async () => {
    try {
      const response = await api.get('/study-requests/worklist/');
      return response.data;
    } catch (error) {
      console.error('Error fetching worklist:', error);
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
};