
// // import axios from 'axios';
// // import { 
// //   formatServerTimeToKST, 
// //   formatForDateTimeInput, 
// //   toKSTISO, 
// //   debugTime
// // } from '../utils/timeUtils';

// // // ✅ 올바른 IP 주소로 수정
// // const API_BASE_URL = 'http://35.225.63.41:8000/api';

// // const api = axios.create({
// //   baseURL: API_BASE_URL,
// //   headers: {
// //     'Content-Type': 'application/json',
// //   },
// // });

// // // ✅ KST 기준 오늘 날짜 계산 (scheduleService 내부 함수)
// // const getTodayKST = () => {
// //   const now = new Date();
  
// //   // 방법 1: Intl API 사용 (더 정확함)
// //   const kstDate = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
  
// //   const year = kstDate.getFullYear();
// //   const month = String(kstDate.getMonth() + 1).padStart(2, '0');
// //   const day = String(kstDate.getDate()).padStart(2, '0');
  
// //   const kstDateString = `${year}-${month}-${day}`;
  
// //   console.log('🕐 KST 오늘 날짜 계산:');
// //   console.log('  브라우저 로컬:', now.toString());
// //   console.log('  KST 변환:', kstDate.toString());
// //   console.log('  KST 오늘 날짜:', kstDateString);
  
// //   return kstDateString;
// // };

// // // ✅ 현재 시간 디버깅 함수
// // const debugCurrentTime = () => {
// //   const now = new Date();
  
// //   // 방법 1: Intl API
// //   const kstIntl = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
// //   const kstIntlDate = kstIntl.toISOString().split('T')[0];
  
// //   // 방법 2: 수동 계산
// //   const kstManual = new Date(now.getTime() + (9 * 60 * 60 * 1000));
// //   const kstManualDate = kstManual.toISOString().split('T')[0];
  
// //   console.log('🕐 현재 시간 디버깅:');
// //   console.log('  UTC 현재:', now.toISOString());
// //   console.log('  KST (Intl):', kstIntlDate);
// //   console.log('  KST (Manual):', kstManualDate);
// //   console.log('  사용할 날짜:', kstIntlDate);
  
// //   return kstIntlDate;
// // };

// // // 에러 응답 인터셉터 추가 (디버깅용)
// // api.interceptors.response.use(
// //   (response) => {
// //     console.log('✅ API Success:', {
// //       url: response.config.url,
// //       status: response.status,
// //       dataType: Array.isArray(response.data) ? `배열(${response.data.length}개)` : 
// //                 response.data.results ? `페이지네이션(${response.data.results.length}개)` : 
// //                 typeof response.data
// //     });
// //     return response;
// //   },
// //   (error) => {
// //     console.error('❌ API Error:', {
// //       url: error.config?.url,
// //       status: error.response?.status,
// //       message: error.message
// //     });
// //     if (error.response) {
// //       console.error('Status:', error.response.status);
// //       console.error('Data:', error.response.data);
// //     }
// //     return Promise.reject(error);
// //   }
// // );

// // export const scheduleService = {
// //   // ✅ 전체 일정 조회 (페이지네이션 처리)
// //   getCommonSchedules: async () => {
// //     try {
// //       const response = await api.get('/schedules/common/');
      
// //       // 페이지네이션 구조 처리: {count, results}
// //       return response.data.results || response.data;
// //     } catch (error) {
// //       console.error('Error fetching common schedules:', error);
// //       throw error;
// //     }
// //   },

// //   // ✅ 부서 일정 조회 (페이지네이션 처리)
// //   getRISSchedules: async () => {
// //     try {
// //       const response = await api.get('/schedules/ris/');
      
// //       // 페이지네이션 구조 처리: {count, results}
// //       return response.data.results || response.data;
// //     } catch (error) {
// //       console.error('Error fetching RIS schedules:', error);
// //       throw error;
// //     }
// //   },

// //   // ✅ 개인 일정 조회 (직접 배열)
// //   getPersonalSchedules: async () => {
// //     try {
// //       const response = await api.get('/schedules/personal/my_schedules/');
      
// //       // 직접 배열 구조
// //       return response.data;
// //     } catch (error) {
// //       console.error('Error fetching personal schedules:', error);
// //       throw error;
// //     }
// //   },

// //   // ✅ 개인 일정 조회 (시간 디버깅 포함)
// //   getPersonalSchedulesDebug: async () => {
// //     try {
// //       const response = await api.get('/schedules/personal/my_schedules/');
      
// //       console.log('📅 일정 조회 결과 (시간 디버깅):');
// //       if (response.data && response.data.length > 0) {
// //         response.data.forEach((schedule, index) => {
// //           console.log(`📅 일정 ${index + 1}: ${schedule.title}`);
// //           debugTime(schedule.datetime, `일정 ${index + 1} 시작시간`);
// //           if (schedule.end_datetime) {
// //             debugTime(schedule.end_datetime, `일정 ${index + 1} 종료시간`);
// //           }
// //         });
// //       }
      
// //       return response.data;
// //     } catch (error) {
// //       console.error('Error fetching personal schedules:', error);
// //       throw error;
// //     }
// //   },

// //   // ✅ 오늘 개인 일정 조회 (직접 배열)
// //   getTodayPersonalSchedules: async () => {
// //     try {
// //       const response = await api.get('/schedules/personal/today_schedules/');
      
// //       // 직접 배열 구조
// //       return response.data;
// //     } catch (error) {
// //       console.error('Error fetching today personal schedules:', error);
// //       throw error;
// //     }
// //   },

// //   // ✅ 개인 일정 생성 (시간대 처리 개선)
// //   createPersonalSchedule: async (scheduleData) => {
// //     try {
// //       console.log('🕐 Creating personal schedule (원본 데이터):', scheduleData);
      
// //       // ✅ timeUtils 사용하여 KST 처리
// //       const cleanData = {
// //         title: scheduleData.title,
// //         datetime: toKSTISO(scheduleData.datetime), // KST 명시적 지정
// //         description: scheduleData.description || '',
// //         ...(scheduleData.end_datetime && scheduleData.end_datetime !== '' && {
// //           end_datetime: toKSTISO(scheduleData.end_datetime)
// //         })
// //       };
      
// //       console.log('🕐 Cleaned data (KST 처리됨):', cleanData);
      
// //       const response = await api.post('/schedules/personal/', cleanData);
      
// //       console.log('🕐 Server response:', response.data);
// //       return response.data;
// //     } catch (error) {
// //       console.error('Error creating personal schedule:', error);
      
// //       if (error.response) {
// //         console.error('Server Error Details:');
// //         console.error('Status:', error.response.status);
// //         console.error('Data:', error.response.data);
// //         console.error('Headers:', error.response.headers);
        
// //         if (typeof error.response.data === 'string' && error.response.data.includes('<!DOCTYPE html>')) {
// //           console.error('Server returned HTML error page - check Django server logs');
// //         }
// //       }
      
// //       throw error;
// //     }
// //   },

// //   // ✅ 개인 일정 수정 (시간대 처리 개선)
// //   updatePersonalSchedule: async (id, scheduleData) => {
// //     try {
// //       console.log('🕐 Updating personal schedule:', id, scheduleData);
      
// //       const cleanData = {
// //         title: scheduleData.title,
// //         datetime: toKSTISO(scheduleData.datetime), // KST 명시적 지정
// //         description: scheduleData.description || '',
// //         ...(scheduleData.end_datetime && scheduleData.end_datetime !== '' && {
// //           end_datetime: toKSTISO(scheduleData.end_datetime)
// //         })
// //       };
      
// //       console.log('🕐 Update cleaned data (KST 처리됨):', cleanData);
      
// //       const response = await api.put(`/schedules/personal/${id}/`, cleanData);
// //       return response.data;
// //     } catch (error) {
// //       console.error('Error updating personal schedule:', error);
// //       throw error;
// //     }
// //   },

// //   // 개인 일정 삭제
// //   deletePersonalSchedule: async (id) => {
// //     try {
// //       console.log('Deleting personal schedule:', id);
// //       await api.delete(`/schedules/personal/${id}/`);
// //     } catch (error) {
// //       console.error('Error deleting personal schedule:', error);
// //       throw error;
// //     }
// //   },

// //   // ✅ 특정 날짜의 모든 일정 조회 (객체 구조)
// //   getSchedulesByDate: async (dateString) => {
// //     try {
// //       console.log('Getting schedules for date:', dateString);
      
// //       const response = await api.get(`/schedules/personal/date/${dateString}/`);
      
// //       // 객체 구조: {date, common_schedules, ris_schedules, personal_schedules}
// //       return response.data;
// //     } catch (error) {
// //       console.error('Error getting schedules by date:', error);
      
// //       return {
// //         date: dateString,
// //         common_schedules: [],
// //         ris_schedules: [],
// //         personal_schedules: []
// //       };
// //     }
// //   },

// //   // ✅ 월별 일정 요약 조회 (객체 구조)
// //   getMonthSchedulesSummary: async (year, month) => {
// //     try {
// //       console.log('Getting month schedules summary:', year, month);
      
// //       const response = await api.get(`/schedules/personal/month/${year}/${month}/`);
      
// //       // 객체 구조: {status, year, month, appointments}
// //       return response.data;
// //     } catch (error) {
// //       console.error('Error getting month schedules summary:', error);
      
// //       return {
// //         year: year,
// //         month: month,
// //         status: 'error',
// //         appointments: []
// //       };
// //     }
// //   },

// //   // ✅ 오늘의 모든 일정 조회 (KST 기준) - 수정됨
// //   getTodaySchedules: async () => {
// //     try {
// //       console.log('Getting today schedules (KST)');
      
// //       // ✅ 내부 함수 사용하여 정확한 KST 기준 오늘 날짜
// //       const today = getTodayKST();
// //       console.log('🕐 Today (KST):', today);
      
// //       return await scheduleService.getSchedulesByDate(today);
// //     } catch (error) {
// //       console.error('Error getting today schedules:', error);
// //       return {
// //         common_schedules: [],
// //         ris_schedules: [],
// //         personal_schedules: []
// //       };
// //     }
// //   },

// //   // 검사실 스케줄 조회
// //   getRoomSchedules: async (date = null, rooms = null) => {
// //     try {
// //       console.log('Getting room schedules for date:', date, 'rooms:', rooms);
      
// //       let url = '/schedules/room-schedules/';
// //       const params = new URLSearchParams();
      
// //       if (date) params.append('date', date);
// //       if (rooms && rooms.length > 0) params.append('rooms', rooms.join(','));
      
// //       if (params.toString()) url += '?' + params.toString();
      
// //       const response = await api.get(url);
// //       return response.data;
// //     } catch (error) {
// //       console.error('Error fetching room schedules:', error);
      
// //       return {
// //         date: date || getTodayKST(), // ✅ KST 기준 오늘 날짜
// //         room_schedules: {},
// //         total_count: 0
// //       };
// //     }
// //   },

// //   // 검사실 스케줄 요약
// //   getRoomSchedulesSummary: async (date = null) => {
// //     try {
// //       console.log('Getting room schedules summary for date:', date);
      
// //       let url = '/schedules/room-schedules-summary/';
// //       if (date) url += `?date=${date}`;
      
// //       const response = await api.get(url);
// //       return response.data;
// //     } catch (error) {
// //       console.error('Error fetching room schedules summary:', error);
      
// //       return {
// //         date: date || getTodayKST(), // ✅ KST 기준 오늘 날짜
// //         room_statistics: []
// //       };
// //     }
// //   },

// //   // 검사실 목록 조회
// //   getExamRooms: async () => {
// //     try {
// //       const response = await api.get('/rooms/');
// //       return response.data;
// //     } catch (error) {
// //       console.error('Error fetching exam rooms:', error);
// //       throw error;
// //     }
// //   },

// //   // 활성화된 검사실만 조회
// //   getActiveExamRooms: async () => {
// //     try {
// //       const response = await api.get('/rooms/active_rooms/');
// //       return response.data;
// //     } catch (error) {
// //       console.error('Error fetching active exam rooms:', error);
// //       throw error;
// //     }
// //   },

// //   // ✅ 디버깅 함수들 노출
// //   debugCurrentTime,
// //   getTodayKST
// // };

// // // ✅ 개발환경에서 전역 노출 (디버깅용)
// // if (process.env.NODE_ENV === 'development') {
// //   window.scheduleService = scheduleService;
// //   console.log('🔧 scheduleService가 window.scheduleService로 노출됨');
// //   console.log('🔧 사용법: window.scheduleService.debugCurrentTime()');
// // }

// import axios from 'axios';
// import { getTodayKST } from '../utils/timeUtils';

// const API_BASE_URL = 'http://35.225.63.41:8000/api';

// const api = axios.create({
//   baseURL: API_BASE_URL,
//   headers: {
//     'Content-Type': 'application/json',
//   },
// });

// // 에러 응답 인터셉터 추가 (디버깅용)
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     console.error('API Error:', error);
//     if (error.response) {
//       console.error('Status:', error.response.status);
//       console.error('Data:', error.response.data);
//     }
//     return Promise.reject(error);
//   }
// );

// export const scheduleService = {
//   // ✅ timeUtils의 getTodayKST 함수 사용
//   getTodayKST,

//   // 전체 일정 조회
//   getCommonSchedules: async () => {
//     try {
//       const response = await api.get('/schedules/common/');
//       return response.data;
//     } catch (error) {
//       console.error('Error fetching common schedules:', error);
//       throw error;
//     }
//   },

//   // 부서 일정 조회
//   getRISSchedules: async () => {
//     try {
//       const response = await api.get('/schedules/ris/');
//       return response.data;
//     } catch (error) {
//       console.error('Error fetching RIS schedules:', error);
//       throw error;
//     }
//   },

//   // 개인 일정 조회 (Django URL에 맞춤)
//   getPersonalSchedules: async () => {
//     try {
//       const response = await api.get('/schedules/personal/my_schedules/');
//       return response.data;
//     } catch (error) {
//       console.error('Error fetching personal schedules:', error);
//       throw error;
//     }
//   },

//   // 오늘 개인 일정 조회 (Django URL에 맞춤)
//   getTodayPersonalSchedules: async () => {
//     try {
//       const response = await api.get('/schedules/personal/today_schedules/');
//       return response.data;
//     } catch (error) {
//       console.error('Error fetching today personal schedules:', error);
//       throw error;
//     }
//   },

//   // 개인 일정 생성
//   createPersonalSchedule: async (scheduleData) => {
//     try {
//       console.log('Creating personal schedule:', scheduleData);
      
//       // 데이터 검증 및 정리
//       const cleanData = {
//         title: scheduleData.title,
//         datetime: scheduleData.datetime,
//         description: scheduleData.description || '',
//         // end_datetime이 빈 문자열이면 보내지 않음 (Django에서 null 처리)
//         ...(scheduleData.end_datetime && scheduleData.end_datetime !== '' && {
//           end_datetime: scheduleData.end_datetime
//         })
//       };
      
//       console.log('Cleaned data:', cleanData);
      
//       const response = await api.post('/schedules/personal/', cleanData);
//       return response.data;
//     } catch (error) {
//       console.error('Error creating personal schedule:', error);
      
//       // 서버 오류 상세 정보 출력
//       if (error.response) {
//         console.error('Server Error Details:');
//         console.error('Status:', error.response.status);
//         console.error('Data:', error.response.data);
//         console.error('Headers:', error.response.headers);
        
//         // HTML 오류 페이지인 경우 (Django 500 오류)
//         if (typeof error.response.data === 'string' && error.response.data.includes('<!DOCTYPE html>')) {
//           console.error('Server returned HTML error page - check Django server logs');
//         }
//       }
      
//       throw error;
//     }
//   },

//   // 개인 일정 수정
//   updatePersonalSchedule: async (id, scheduleData) => {
//     try {
//       console.log('Updating personal schedule:', id, scheduleData);
      
//       const cleanData = {
//         title: scheduleData.title,
//         datetime: scheduleData.datetime,
//         description: scheduleData.description || '',
//         ...(scheduleData.end_datetime && scheduleData.end_datetime !== '' && {
//           end_datetime: scheduleData.end_datetime
//         })
//       };
      
//       const response = await api.put(`/schedules/personal/${id}/`, cleanData);
//       return response.data;
//     } catch (error) {
//       console.error('Error updating personal schedule:', error);
//       throw error;
//     }
//   },

//   // 개인 일정 삭제
//   deletePersonalSchedule: async (id) => {
//     try {
//       console.log('Deleting personal schedule:', id);
//       await api.delete(`/schedules/personal/${id}/`);
//     } catch (error) {
//       console.error('Error deleting personal schedule:', error);
//       throw error;
//     }
//   },

//   // 🆕 특정 날짜의 모든 일정 조회 (Django URL에 맞춤)
//   getSchedulesByDate: async (dateString) => {
//     try {
//       console.log('Getting schedules for date:', dateString);
      
//       // Django URL 패턴에 맞춤: /schedules/personal/date/2025-06-22/
//       const response = await api.get(`/schedules/personal/date/${dateString}/`);
//       return response.data;
//     } catch (error) {
//       console.error('Error getting schedules by date:', error);
      
//       // 에러 시 빈 데이터 반환하여 앱이 계속 작동하도록 함
//       return {
//         date: dateString,
//         common_schedules: [],
//         ris_schedules: [],
//         personal_schedules: []
//       };
//     }
//   },

//   // 🆕 월별 일정 요약 조회 (Django URL에 맞춤)
//   getMonthSchedulesSummary: async (year, month) => {
//     try {
//       console.log('Getting month schedules summary:', year, month);
      
//       // Django URL 패턴에 맞춤: /schedules/personal/month/2025/6/
//       const response = await api.get(`/schedules/personal/month/${year}/${month}/`);
//       return response.data;
//     } catch (error) {
//       console.error('Error getting month schedules summary:', error);
      
//       // 에러 시 빈 데이터 반환
//       return {
//         year: year,
//         month: month,
//         schedules: {}
//       };
//     }
//   },

//   // 🆕 오늘의 모든 일정 조회
//   getTodaySchedules: async () => {
//     try {
//       console.log('Getting today schedules');
//       const today = getTodayKST(); // timeUtils 함수 사용
//       return await scheduleService.getSchedulesByDate(today);
//     } catch (error) {
//       console.error('Error getting today schedules:', error);
//       return {
//         common_schedules: [],
//         ris_schedules: [],
//         personal_schedules: []
//       };
//     }
//   },

//   // 🆕 검사실 스케줄 조회
//   getRoomSchedules: async (date = null, rooms = null) => {
//     try {
//       console.log('Getting room schedules for date:', date, 'rooms:', rooms);
      
//       let url = '/schedules/room-schedules/';
//       const params = new URLSearchParams();
      
//       if (date) params.append('date', date);
//       if (rooms && rooms.length > 0) params.append('rooms', rooms.join(','));
      
//       if (params.toString()) url += '?' + params.toString();
      
//       const response = await api.get(url);
//       return response.data;
//     } catch (error) {
//       console.error('Error fetching room schedules:', error);
      
//       // 에러 시 빈 데이터 반환
//       return {
//         date: date || getTodayKST(),
//         room_schedules: {},
//         total_count: 0
//       };
//     }
//   },

//   // 🆕 검사실 스케줄 요약
//   getRoomSchedulesSummary: async (date = null) => {
//     try {
//       console.log('Getting room schedules summary for date:', date);
      
//       let url = '/schedules/room-schedules-summary/';
//       if (date) url += `?date=${date}`;
      
//       const response = await api.get(url);
//       return response.data;
//     } catch (error) {
//       console.error('Error fetching room schedules summary:', error);
      
//       // 에러 시 빈 데이터 반환
//       return {
//         date: date || getTodayKST(),
//         room_statistics: []
//       };
//     }
//   },

//   // 🆕 검사실 목록 조회
//   getExamRooms: async () => {
//     try {
//       const response = await api.get('/rooms/');
//       return response.data;
//     } catch (error) {
//       console.error('Error fetching exam rooms:', error);
//       throw error;
//     }
//   },

//   // 🆕 활성화된 검사실만 조회
//   getActiveExamRooms: async () => {
//     try {
//       const response = await api.get('/rooms/active_rooms/');
//       return response.data;
//     } catch (error) {
//       console.error('Error fetching active exam rooms:', error);
//       throw error;
//     }
//   }
// };

// // ✅ 개발환경에서 전역 노출 (추가됨)
// if (process.env.NODE_ENV === 'development') {
//   window.scheduleService = scheduleService;
//   console.log('🔧 scheduleService가 window.scheduleService로 노출됨');
// }


// services/scheduleService.js - 시간대 처리 완전 수정

import axios from 'axios';
import { getTodayKST, formatDateTimeForServer } from '../utils/timeUtils';

const API_BASE_URL = 'http://35.225.63.41:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 에러 응답 인터셉터
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
  getTodayKST,

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

  // 개인 일정 조회
  getPersonalSchedules: async () => {
    try {
      const response = await api.get('/schedules/personal/my_schedules/');
      return response.data;
    } catch (error) {
      console.error('Error fetching personal schedules:', error);
      throw error;
    }
  },

  // 오늘 개인 일정 조회
  getTodayPersonalSchedules: async () => {
    try {
      const response = await api.get('/schedules/personal/today_schedules/');
      return response.data;
    } catch (error) {
      console.error('Error fetching today personal schedules:', error);
      throw error;
    }
  },

  // 🔧 개인 일정 생성 - 시간 처리 수정
  createPersonalSchedule: async (scheduleData) => {
    try {
      console.log('🕐 Creating personal schedule (원본):', scheduleData);
      
      // timeUtils를 사용하여 올바른 시간 변환
      const cleanData = {
        title: scheduleData.title,
        datetime: formatDateTimeForServer(scheduleData.datetime), // 🔧 수정
        description: scheduleData.description || '',
      };
      
      // end_datetime 처리
      if (scheduleData.end_datetime && scheduleData.end_datetime !== '') {
        cleanData.end_datetime = formatDateTimeForServer(scheduleData.end_datetime); // 🔧 수정
      }
      
      console.log('🕐 Server로 보낼 데이터 (KST):', cleanData);
      
      const response = await api.post('/schedules/personal/', cleanData);
      console.log('🕐 Server 응답:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Error creating personal schedule:', error);
      
      if (error.response) {
        console.error('Server Error Details:');
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
        
        if (typeof error.response.data === 'string' && error.response.data.includes('<!DOCTYPE html>')) {
          console.error('Server returned HTML error page - check Django server logs');
        }
      }
      
      throw error;
    }
  },

  // 🔧 개인 일정 수정 - 시간 처리 수정
  updatePersonalSchedule: async (id, scheduleData) => {
    try {
      console.log('🕐 Updating personal schedule:', id, scheduleData);
      
      // timeUtils를 사용하여 올바른 시간 변환
      const cleanData = {
        title: scheduleData.title,
        datetime: formatDateTimeForServer(scheduleData.datetime), // 🔧 수정
        description: scheduleData.description || '',
      };
      
      // end_datetime 처리
      if (scheduleData.end_datetime && scheduleData.end_datetime !== '') {
        cleanData.end_datetime = formatDateTimeForServer(scheduleData.end_datetime); // 🔧 수정
      }
      
      console.log('🕐 Update data (KST):', cleanData);
      
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

  // 특정 날짜의 모든 일정 조회
  getSchedulesByDate: async (dateString) => {
    try {
      console.log('Getting schedules for date:', dateString);
      
      const response = await api.get(`/schedules/personal/date/${dateString}/`);
      return response.data;
    } catch (error) {
      console.error('Error getting schedules by date:', error);
      
      return {
        date: dateString,
        common_schedules: [],
        ris_schedules: [],
        personal_schedules: []
      };
    }
  },

  // 월별 일정 요약 조회
  getMonthSchedulesSummary: async (year, month) => {
    try {
      console.log('Getting month schedules summary:', year, month);
      
      const response = await api.get(`/schedules/personal/month/${year}/${month}/`);
      return response.data;
    } catch (error) {
      console.error('Error getting month schedules summary:', error);
      
      return {
        year: year,
        month: month,
        schedules: {}
      };
    }
  },

  // 오늘의 모든 일정 조회
  getTodaySchedules: async () => {
    try {
      console.log('Getting today schedules');
      const today = getTodayKST();
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

  // 검사실 스케줄 조회
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
      
      return {
        date: date || getTodayKST(),
        room_schedules: {},
        total_count: 0
      };
    }
  },

  // 검사실 스케줄 요약
  getRoomSchedulesSummary: async (date = null) => {
    try {
      console.log('Getting room schedules summary for date:', date);
      
      let url = '/schedules/room-schedules-summary/';
      if (date) url += `?date=${date}`;
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching room schedules summary:', error);
      
      return {
        date: date || getTodayKST(),
        room_statistics: []
      };
    }
  },

  // 검사실 목록 조회
  getExamRooms: async () => {
    try {
      const response = await api.get('/rooms/');
      return response.data;
    } catch (error) {
      console.error('Error fetching exam rooms:', error);
      throw error;
    }
  },

  // 활성화된 검사실만 조회
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

// 개발환경에서 전역 노출
if (process.env.NODE_ENV === 'development') {
  window.scheduleService = scheduleService;
  console.log('🔧 scheduleService가 window.scheduleService로 노출됨');
}