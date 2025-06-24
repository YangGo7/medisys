import axios from 'axios';

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
    console.error('API Error:', error);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    return Promise.reject(error);
  }
);

export const scheduleService = {
  // 전체 일정 조회
  getCommonSchedules: async () => {
    try {
      const response = await api.get('/schedules/common/');
      return response.data;
    } catch (error) {
      console.error('Error fetching common schedules:', error);
      throw error;
    }
  },

  // 부서 일정 조회
  getRISSchedules: async () => {
    try {
      const response = await api.get('/schedules/ris/');
      return response.data;
    } catch (error) {
      console.error('Error fetching RIS schedules:', error);
      throw error;
    }
  },

  // 개인 일정 조회 (Django URL에 맞춤)
  getPersonalSchedules: async () => {
    try {
      const response = await api.get('/schedules/personal/my_schedules/');
      return response.data;
    } catch (error) {
      console.error('Error fetching personal schedules:', error);
      throw error;
    }
  },

  // 오늘 개인 일정 조회 (Django URL에 맞춤)
  getTodayPersonalSchedules: async () => {
    try {
      const response = await api.get('/schedules/personal/today_schedules/');
      return response.data;
    } catch (error) {
      console.error('Error fetching today personal schedules:', error);
      throw error;
    }
  },

  // 개인 일정 생성
  createPersonalSchedule: async (scheduleData) => {
    try {
      console.log('Creating personal schedule:', scheduleData);
      
      // 데이터 검증 및 정리
      const cleanData = {
        title: scheduleData.title,
        datetime: scheduleData.datetime,
        description: scheduleData.description || '',
        // end_datetime이 빈 문자열이면 보내지 않음 (Django에서 null 처리)
        ...(scheduleData.end_datetime && scheduleData.end_datetime !== '' && {
          end_datetime: scheduleData.end_datetime
        })
      };
      
      console.log('Cleaned data:', cleanData);
      
      const response = await api.post('/schedules/personal/', cleanData);
      return response.data;
    } catch (error) {
      console.error('Error creating personal schedule:', error);
      
      // 서버 오류 상세 정보 출력
      if (error.response) {
        console.error('Server Error Details:');
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
        console.error('Headers:', error.response.headers);
        
        // HTML 오류 페이지인 경우 (Django 500 오류)
        if (typeof error.response.data === 'string' && error.response.data.includes('<!DOCTYPE html>')) {
          console.error('Server returned HTML error page - check Django server logs');
        }
      }
      
      throw error;
    }
  },

  // 개인 일정 수정
  updatePersonalSchedule: async (id, scheduleData) => {
    try {
      console.log('Updating personal schedule:', id, scheduleData);
      
      const cleanData = {
        title: scheduleData.title,
        datetime: scheduleData.datetime,
        description: scheduleData.description || '',
        ...(scheduleData.end_datetime && scheduleData.end_datetime !== '' && {
          end_datetime: scheduleData.end_datetime
        })
      };
      
      const response = await api.put(`/schedules/personal/${id}/`, cleanData);
      return response.data;
    } catch (error) {
      console.error('Error updating personal schedule:', error);
      throw error;
    }
  },

  // 개인 일정 삭제
  deletePersonalSchedule: async (id) => {
    try {
      console.log('Deleting personal schedule:', id);
      await api.delete(`/schedules/personal/${id}/`);
    } catch (error) {
      console.error('Error deleting personal schedule:', error);
      throw error;
    }
  },

  // 🆕 특정 날짜의 모든 일정 조회 (Django URL에 맞춤)
  getSchedulesByDate: async (dateString) => {
    try {
      console.log('Getting schedules for date:', dateString);
      
      // Django URL 패턴에 맞춤: /schedules/personal/date/2025-06-22/
      const response = await api.get(`/schedules/personal/date/${dateString}/`);
      return response.data;
    } catch (error) {
      console.error('Error getting schedules by date:', error);
      
      // 에러 시 빈 데이터 반환하여 앱이 계속 작동하도록 함
      return {
        date: dateString,
        common_schedules: [],
        ris_schedules: [],
        personal_schedules: []
      };
    }
  },

  // 🆕 월별 일정 요약 조회 (Django URL에 맞춤)
  getMonthSchedulesSummary: async (year, month) => {
    try {
      console.log('Getting month schedules summary:', year, month);
      
      // Django URL 패턴에 맞춤: /schedules/personal/month/2025/6/
      const response = await api.get(`/schedules/personal/month/${year}/${month}/`);
      return response.data;
    } catch (error) {
      console.error('Error getting month schedules summary:', error);
      
      // 에러 시 빈 데이터 반환
      return {
        year: year,
        month: month,
        schedules: {}
      };
    }
  },

  // 🆕 오늘의 모든 일정 조회
  getTodaySchedules: async () => {
    try {
      console.log('Getting today schedules');
      const today = new Date().toISOString().split('T')[0];
      return await scheduleService.getSchedulesByDate(today);
    } catch (error) {
      console.error('Error getting today schedules:', error);
      return {
        common_schedules: [],
        ris_schedules: [],
        personal_schedules: []
      };
    }
  },

  // 🆕 검사실 스케줄 조회
  getRoomSchedules: async (date = null, rooms = null) => {
    try {
      console.log('Getting room schedules for date:', date, 'rooms:', rooms);
      
      let url = '/schedules/room-schedules/';
      const params = new URLSearchParams();
      
      if (date) params.append('date', date);
      if (rooms && rooms.length > 0) params.append('rooms', rooms.join(','));
      
      if (params.toString()) url += '?' + params.toString();
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching room schedules:', error);
      
      // 에러 시 빈 데이터 반환
      return {
        date: date || new Date().toISOString().split('T')[0],
        room_schedules: {},
        total_count: 0
      };
    }
  },

  // 🆕 검사실 스케줄 요약
  getRoomSchedulesSummary: async (date = null) => {
    try {
      console.log('Getting room schedules summary for date:', date);
      
      let url = '/schedules/room-schedules-summary/';
      if (date) url += `?date=${date}`;
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching room schedules summary:', error);
      
      // 에러 시 빈 데이터 반환
      return {
        date: date || new Date().toISOString().split('T')[0],
        room_statistics: []
      };
    }
  },

  // 🆕 검사실 목록 조회
  getExamRooms: async () => {
    try {
      const response = await api.get('/rooms/');
      return response.data;
    } catch (error) {
      console.error('Error fetching exam rooms:', error);
      throw error;
    }
  },

  // 🆕 활성화된 검사실만 조회
  getActiveExamRooms: async () => {
    try {
      const response = await api.get('/rooms/active_rooms/');
      return response.data;
    } catch (error) {
      console.error('Error fetching active exam rooms:', error);
      throw error;
    }
  }
};