// // pacsapp/src/services/worklistService.js - API 경로 수정
// import axios from 'axios';

// const API_BASE_URL = 'http://35.225.63.41:8000/api';

// const api = axios.create({
//   baseURL: API_BASE_URL,
//   headers: {
//     'Content-Type': 'application/json',
//   },
// });

// // 에러 응답 인터셉터 추가
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     console.error('Worklist API Error:', error);
//     if (error.response) {
//       console.error('Status:', error.response.status);
//       console.error('Data:', error.response.data);
//       console.error('Full URL:', error.config?.url);
//     }
//     return Promise.reject(error);
//   }
// );

// export const worklistService = {
//   // 🔧 워크리스트 조회 - 새로운 Django URL에 맞춤
//   getWorklist: async () => {
//     try {
//       console.log('🔗 Fetching worklist from:', `${API_BASE_URL}/study-requests/worklist/`);
//       const response = await api.get('/study-requests/worklist/');
//       console.log('✅ Worklist response:', response.data);
//       return response.data;
//     } catch (error) {
//       console.error('❌ Error fetching worklist:', error);
      
//       // 404 오류 시 대체 API 시도
//       if (error.response?.status === 404) {
//         console.log('🔄 Trying alternative API endpoint...');
//         try {
//           const response = await api.get('/study-requests/');
//           console.log('✅ Alternative API response:', response.data);
//           return response.data;
//         } catch (altError) {
//           console.error('❌ Alternative API also failed:', altError);
//         }
//       }
      
//       throw error;
//     }
//   },

//   // 검사 배정
//   assignExam: async (examId, assignmentData) => {
//     try {
//       console.log('Assigning exam:', examId, assignmentData);
//       const response = await api.post(`/study-requests/${examId}/assign/`, assignmentData);
//       return response.data;
//     } catch (error) {
//       console.error('Error assigning exam:', error);
//       throw error;
//     }
//   },

//   // 검사 시작
//   startExam: async (examId) => {
//     try {
//       const response = await api.post(`/study-requests/${examId}/start_exam/`);
//       return response.data;
//     } catch (error) {
//       console.error('Error starting exam:', error);
//       throw error;
//     }
//   },

//   // 검사 완료
//   completeExam: async (examId) => {
//     try {
//       const response = await api.post(`/study-requests/${examId}/complete_exam/`);
//       return response.data;
//     } catch (error) {
//       console.error('Error completing exam:', error);
//       throw error;
//     }
//   },

//   // 검사 취소
//   cancelExam: async (examId) => {
//     try {
//       const response = await api.post(`/study-requests/${examId}/cancel_exam/`);
//       return response.data;
//     } catch (error) {
//       console.error('Error canceling exam:', error);
//       throw error;
//     }
//   },

//   // 🆕 API 연결 테스트 함수
//   testConnection: async () => {
//     try {
//       console.log('🔍 Testing API connection...');
      
//       // 여러 엔드포인트 테스트
//       const endpoints = [
//         '/study-requests/worklist/',
//         '/study-requests/',
//         '/health/',
//         '/doctors/',
//         '/rooms/'
//       ];
      
//       const results = [];
      
//       for (const endpoint of endpoints) {
//         try {
//           console.log(`Testing: ${API_BASE_URL}${endpoint}`);
//           const response = await api.get(endpoint);
//           results.push({
//             endpoint,
//             status: 'success',
//             code: response.status,
//             data: response.data
//           });
//           console.log(`✅ ${endpoint}: OK`);
//         } catch (err) {
//           results.push({
//             endpoint,
//             status: 'error',
//             code: err.response?.status || 'Network Error',
//             error: err.message
//           });
//           console.log(`❌ ${endpoint}: ${err.response?.status || 'Network Error'}`);
//         }
//       }
      
//       return results;
//     } catch (error) {
//       console.error('Connection test failed:', error);
//       return [{
//         endpoint: 'general',
//         status: 'error',
//         error: error.message
//       }];
//     }
//   }
// };


import axios from 'axios';

const API_BASE_URL = 'http://35.225.63.41:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});

// ✅ 한국어 날짜 파싱 ("2025. 6. 26. 오전 5:45" → "2025-06-26")
const parseKoreanDate = (koreanStr) => {
  if (!koreanStr) return null;
  const match = koreanStr.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\./);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return null;
};

export const worklistService = {
  // ✅ 실제 Django API 사용 (/study-requests/worklist/)
  getWorklist: async () => {
    try {
      console.log('🔍 워크리스트 조회');
      const response = await api.get('/study-requests/worklist/');
      console.log(`✅ 성공: ${response.data.length}개`);
      return response.data;
    } catch (error) {
      console.error('❌ 워크리스트 조회 실패:', error);
      throw error;
    }
  },

  // ✅ 날짜별 워크리스트 (Django에서 지원하면 서버 필터, 아니면 클라이언트 필터)
  getWorklistByDate: async (targetDate) => {
    try {
      console.log(`🔍 날짜별 조회: ${targetDate}`);
      
      // 1. 서버 필터 시도 (Django에서 지원할 수도 있음)
      try {
        const response = await api.get(`/study-requests/worklist/?date=${targetDate}`);
        console.log(`✅ 서버 필터 성공: ${response.data.length}개`);
        return response.data;
      } catch (serverError) {
        console.log('⚠️ 서버 필터 미지원, 클라이언트 필터 시도');
      }
      
      // 2. 클라이언트 필터
      const allData = await worklistService.getWorklist();
      const filtered = allData.filter(item => {
        // 한국어 날짜 형식 파싱
        const requestDate = parseKoreanDate(item.requestDateTime);
        const examDate = parseKoreanDate(item.examDateTime);
        
        // 요청일 또는 검사일이 타겟 날짜와 일치하면 포함
        return requestDate === targetDate || examDate === targetDate;
      });
      
      console.log(`✅ 클라이언트 필터 성공: ${filtered.length}개`);
      return filtered;
      
    } catch (error) {
      console.error('❌ 날짜별 조회 실패:', error);
      throw error;
    }
  },

  // ✅ 검사 배정 (실제 Django ViewSet action)
  assignExam: async (examId, assignmentData) => {
    try {
      const response = await api.post(`/study-requests/${examId}/assign/`, assignmentData);
      console.log('✅ 배정 성공');
      return response.data;
    } catch (error) {
      console.error('❌ 배정 실패:', error);
      throw error;
    }
  },

  // ✅ 검사 시작 (실제 Django ViewSet action)
  startExam: async (examId) => {
    try {
      const response = await api.post(`/study-requests/${examId}/start_exam/`);
      console.log('✅ 시작 성공');
      return response.data;
    } catch (error) {
      console.error('❌ 시작 실패:', error);
      throw error;
    }
  },

  // ✅ 검사 완료 (실제 Django ViewSet action)
  completeExam: async (examId) => {
    try {
      const response = await api.post(`/study-requests/${examId}/complete_exam/`);
      console.log('✅ 완료 성공');
      return response.data;
    } catch (error) {
      console.error('❌ 완료 실패:', error);
      throw error;
    }
  },

  // ✅ 검사 취소 (실제 Django ViewSet action)
  cancelExam: async (examId) => {
    try {
      const response = await api.post(`/study-requests/${examId}/cancel_exam/`);
      console.log('✅ 취소 성공');
      return response.data;
    } catch (error) {
      console.error('❌ 취소 실패:', error);
      throw error;
    }
  }
};

// 개발환경 노출
if (process.env.NODE_ENV === 'development') {
  window.worklistService = worklistService;
  window.parseKoreanDate = parseKoreanDate;
  
  console.log('🔧 worklistService 준비됨 (실제 Django API 매칭)');
  console.log('테스트: parseKoreanDate("2025. 6. 26. 오전 5:45")');
}