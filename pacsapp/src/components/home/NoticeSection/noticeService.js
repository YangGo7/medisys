// noticeService.js - API URL 통일 및 main_page_function 공지사항 연결
import axios from 'axios';

// 🔧 API URL 통일 - 실제 Django 서버 URL 사용
const API_BASE_URL = 'http://35.225.63.41:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 에러 응답 인터셉터 추가 (디버깅용)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Notice API Error:', error);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    return Promise.reject(error);
  }
);

export const noticeService = {
  // 🆕 메인 페이지 공지사항 조회 (main_page_function 연결)
  getMainPageNotices: async (type = '', pageSize = 5) => {
    try {
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (pageSize) params.append('page_size', pageSize.toString());
      
      const url = `/main/notices/${params.toString() ? '?' + params.toString() : ''}`;
      console.log('Fetching main notices from:', url);
      
      const response = await api.get(url);
      
      // API 응답 구조 확인
      if (response.data && response.data.data) {
        return response.data.data; // { status: 'success', data: [...] } 구조
      }
      
      return response.data || [];
    } catch (error) {
      console.error('Error fetching main page notices:', error);
      // 에러 시 빈 배열 반환하여 앱이 계속 작동하도록 함
      return [];
    }
  },

  // 🆕 공지사항 게시판용 API (페이징, 검색, 필터링 지원)
  getNoticesBoard: async (params = {}) => {
    try {
      const {
        page = 1,
        pageSize = 10,
        search = '',
        type = '',
        showInactive = false
      } = params;
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        ...(search && { search }),
        ...(type && { type }),
        ...(showInactive && { show_inactive: 'true' })
      });
      
      const url = `/main/notices-board/?${queryParams.toString()}`;
      console.log('Fetching notices board from:', url);
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching notices board:', error);
      throw error;
    }
  },

  // 🆕 공지사항 상세 조회
  getNoticeDetail: async (noticeId) => {
    try {
      const response = await api.get(`/main/notices/${noticeId}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notice detail:', error);
      throw error;
    }
  },

  // 🆕 공지사항 생성
  createNotice: async (noticeData) => {
    try {
      const response = await api.post('/main/notices/', noticeData);
      return response.data;
    } catch (error) {
      console.error('Error creating notice:', error);
      throw error;
    }
  },

  // 🆕 공지사항 수정
  updateNotice: async (noticeId, noticeData) => {
    try {
      const response = await api.put(`/main/notices/${noticeId}/`, noticeData);
      return response.data;
    } catch (error) {
      console.error('Error updating notice:', error);
      throw error;
    }
  },

  // 🆕 공지사항 삭제 (비활성화)
  deleteNotice: async (noticeId) => {
    try {
      const response = await api.delete(`/main/notices/${noticeId}/`);
      return response.data;
    } catch (error) {
      console.error('Error deleting notice:', error);
      throw error;
    }
  },

  // 🆕 긴급 알림 수 조회
  getAlertCount: async () => {
    try {
      const response = await api.get('/main/alert-count/');
      return response.data;
    } catch (error) {
      console.error('Error fetching alert count:', error);
      return {
        status: 'error',
        data: {
          total_alerts: 0,
          urgent_notices: 0
        }
      };
    }
  },

  // 🆕 시스템 상태 확인
  healthCheck: async () => {
    try {
      const response = await api.get('/main/health-check/');
      return response.data;
    } catch (error) {
      console.error('Error in health check:', error);
      throw error;
    }
  },

  // 🔧 기존 메서드들 - 호환성 유지
  // 시스템 공지사항 조회 (main_page_function 연결)
  getSystemNotices: async () => {
    return await noticeService.getMainPageNotices('important', 5);
  },

  // RIS 공지사항 조회 (main_page_function 연결)
  getRISNotices: async () => {
    return await noticeService.getMainPageNotices('general', 5);
  },

  // 🆕 타입별 공지사항 조회
  getNoticesByType: async (type) => {
    return await noticeService.getMainPageNotices(type, 10);
  },

  // 🆕 최신 공지사항 조회
  getLatestNotices: async (limit = 5) => {
    return await noticeService.getMainPageNotices('', limit);
  }
};