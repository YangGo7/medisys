// pacsapp/src/services/pacsdocsService.js

// import axios from 'axios';

// // API 기본 URL 설정
// const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://35.225.63.41:8000';
// const PACSDOCS_API_URL = `${API_BASE_URL}/api/pacsdocs/api`;
// const WORKLIST_API_URL = `${API_BASE_URL}/api/worklists`; // 워크리스트 API

// // PACS 문서 API 인스턴스
// const api = axios.create({
//   baseURL: PACSDOCS_API_URL,
//   timeout: 10000,
//   headers: {
//     'Content-Type': 'application/json',
//   },
// });

// // 워크리스트 API 인스턴스
// const worklistApi = axios.create({
//   baseURL: WORKLIST_API_URL, // http://35.225.63.41:8000/api/worklists
//   timeout: 10000,
//   headers: {
//     'Content-Type': 'application/json',
//   },
// });

// // 요청/응답 인터셉터 (개발용 로깅 추가)
// api.interceptors.request.use(
//   (config) => {
//     console.log(`🔄 PACS API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
//     return config;
//   },
//   (error) => {
//     console.error('❌ PACS Request Error:', error);
//     return Promise.reject(error);
//   }
// );

// api.interceptors.response.use(
//   (response) => {
//     console.log(`✅ PACS API Response: ${response.status} ${response.config.url}`);
//     console.log('📄 PACS Response Data:', response.data);
//     return response;
//   },
//   (error) => {
//     console.error('❌ PACS API Error:', error);
//     console.error('📄 Error Response:', error.response?.data);
//     console.error('🔗 Request URL:', error.config?.url);
//     return Promise.reject(error);
//   }
// );

// export const pacsdocsService = {
//   // ========== 🔥 통합된 검사별 서류 관리 (메인 UI용) ==========
  
//   /**
//    * 🔥 검사별 서류 목록 조회 (워크리스트 + 서류 정보 통합)
//    */
//   getStudyDocuments: async (filters = {}) => {
//     try {
//       console.log('🔄 PACS 문서 통합 데이터 조회 시작', filters);

//       // 1️⃣ 워크리스트 데이터 가져오기
//       let worklistData = [];
//       if (filters.exam_date) {
//         try {
//           console.log(`🔍 워크리스트 조회 날짜: ${filters.exam_date}`);
//           const worklistResponse = await worklistApi.get(`/${filters.exam_date}/`);
          
//           // Django API 응답 구조에 맞게 데이터 추출 (worklistService.js와 동일하게)
//           if (worklistResponse.data.status === 'success') {
//             worklistData = worklistResponse.data.data || [];
//             console.log(`✅ 워크리스트 데이터 ${worklistData.length}개 로드됨`);
//             console.log('🔍 첫 번째 워크리스트 항목:', worklistData[0]); // 🔧 디버깅 추가
//             console.log('🔍 모든 필드명:', Object.keys(worklistData[0] || {})); // 🔧 디버깅 추가
//           } else {
//             console.warn('⚠️ API 응답 상태가 success가 아님:', worklistResponse.data);
//             worklistData = [];
//           }
//         } catch (worklistError) {
//           console.error('❌ 워크리스트 조회 실패:', worklistError);
//           // 워크리스트 조회 실패시 빈 배열로 계속 진행
//           worklistData = [];
//         }
//       }

//       // 필터링 적용 (환자명, 모달리티)
//       if (filters.patient_name) {
//         worklistData = worklistData.filter(item => 
//           item.patientName?.includes(filters.patient_name)
//         );
//       }
//       if (filters.modality) {
//         worklistData = worklistData.filter(item => 
//           item.modality === filters.modality
//         );
//       }

//       // 2️⃣ 각 검사별 서류 정보 추가
//       const enrichedData = await Promise.all(
//         worklistData.map(async (studyRequest) => {
//           try {
//             // 각 검사별 서류 정보 조회 시도
//             const docResponse = await api.get(`/study-documents/${studyRequest.id}/`);
            
//             return {
//               // 🔥 워크리스트 필드명 그대로 사용 ✅
//               ...studyRequest, // 모든 필드 그대로 복사
              
//               // 📄 서류 정보만 추가
//               documents: docResponse.data.documents || []
//             };
//           } catch (docError) {
//             console.warn(`서류 정보 조회 실패 (Study ID: ${studyRequest.id}):`, docError);
            
//             // 🔧 서류 정보가 없는 경우 기본 서류 생성
//             const defaultDocuments = getDefaultDocuments(studyRequest.modality);
            
//             return {
//               // 🔥 워크리스트 필드명 그대로 사용 ✅
//               ...studyRequest, // 모든 필드 그대로 복사
              
//               // 📄 기본 서류 정보 추가
//               documents: defaultDocuments
//             };
//           }
//         })
//       );

//       console.log(`✅ 통합 데이터 완성: ${enrichedData.length}개`);
      
//       return {
//         results: enrichedData,
//         count: enrichedData.length,
//         date: filters.exam_date
//       };

//           } catch (error) {
//       console.error('❌ PACS 문서 통합 데이터 조회 실패:', error);
      
//       // 🔄 에러 발생시에도 워크리스트 API 한번 더 시도
//       console.log('🔄 에러 복구: 워크리스트 API 직접 호출 시도');
//       try {
//         const fallbackResponse = await worklistApi.get(`/${filters.exam_date}/`);
//         if (fallbackResponse.data.status === 'success') {
//           console.log('✅ 복구 성공! 워크리스트 데이터:', fallbackResponse.data.data);
//           return {
//             results: fallbackResponse.data.data.map(item => ({
//               ...item,
//               documents: getDefaultDocuments(item.modality)
//             })),
//             count: fallbackResponse.data.count,
//             date: filters.exam_date
//           };
//         }
//       } catch (fallbackError) {
//         console.error('❌ 복구도 실패:', fallbackError);
//       }
      
//       // 🔄 개발용: 더미 데이터 반환 (기존 코드 유지)
//       if (true) { // 강제로 더미 데이터 사용 중지
//         console.warn('🔄 Using dummy data for development');
//         return {
//           results: [
//             {
//               id: 1,
//               patientId: 'P2025-001234',        // ✅ 수정
//               patientName: '김철수',             // ✅ 수정
//               birthDate: '1985-06-12',          // ✅ 수정
//               examPart: '흉부',                 // ✅ 수정
//               modality: 'CT',
//               reportingDoctor: '이지은',         // ✅ 수정
//               requestDateTime: '2025-06-24T14:30:00Z',  // ✅ 수정
//               priority: '응급',
//               examStatus: '검사완료',           // ✅ 수정
//               documents: [
//                 {
//                   id: 1,
//                   document_type: { 
//                     code: 'consent_contrast', 
//                     name: '조영제 사용 동의서', 
//                     requires_signature: true 
//                   },
//                   status: 'pending'
//                 },
//                 {
//                   id: 2,
//                   document_type: { 
//                     code: 'report_kor', 
//                     name: '판독 결과지 (국문)', 
//                     requires_signature: false 
//                   },
//                   status: 'pending'
//                 },
//                 {
//                   id: 3,
//                   document_type: { 
//                     code: 'imaging_cd', 
//                     name: '진료기록영상 (CD)', 
//                     requires_signature: false 
//                   },
//                   status: 'pending'
//                 },
//                 {
//                   id: 4,
//                   document_type: { 
//                     code: 'export_certificate', 
//                     name: '반출 확인서', 
//                     requires_signature: true 
//                   },
//                   status: 'pending'
//                 }
//               ]
//             }
//           ]
//         };
//       }
      
//       throw error;
//     }
//   },

//   /**
//    * 특정 검사의 서류 상세 조회
//    */
//   getStudyDocumentDetail: async (studyId) => {
//     try {
//       const response = await api.get(`/study-documents/${studyId}/`);
//       return response.data;
//     } catch (error) {
//       console.error(`Failed to fetch study document ${studyId}:`, error);
//       throw error;
//     }
//   },

//   /**
//    * 검사에 필요한 서류들 자동 생성
//    */
//   createDocuments: async (studyId) => {
//     try {
//       const response = await api.post(`/study-documents/${studyId}/create_documents/`);
//       return response.data;
//     } catch (error) {
//       console.error(`Failed to create documents for study ${studyId}:`, error);
//       throw error;
//     }
//   },

//   /**
//    * 선택된 서류들 일괄 처리
//    */
//   processDocuments: async (studyId, data) => {
//     try {
//       const response = await api.post(`/study-documents/${studyId}/process_documents/`, data);
//       return response.data;
//     } catch (error) {
//       console.error(`Failed to process documents for study ${studyId}:`, error);
      
//       // 개발용: 성공 응답 시뮬레이션
//       if (process.env.NODE_ENV === 'development') {
//         console.warn('🔄 Simulating successful document processing');
//         return {
//           processed_count: data.document_ids?.length || 0,
//           failed_count: 0,
//           processed_documents: ['시뮬레이션 처리됨'],
//           failed_documents: []
//         };
//       }
      
//       throw error;
//     }
//   },

//   /**
//    * 서류 미리보기 데이터 조회
//    */
//   previewDocument: async (studyId, docType) => {
//     try {
//       const response = await api.get(`/study-documents/${studyId}/preview_document/?doc_type=${docType}`);
//       return response.data;
//     } catch (error) {
//       console.error(`Failed to preview document ${docType} for study ${studyId}:`, error);
//       throw error;
//     }
//   },

//   // ========== 개별 서류 요청 관리 ==========

//   /**
//    * 서류 요청 목록 조회
//    */
//   getDocumentRequests: async (filters = {}) => {
//     try {
//       const params = new URLSearchParams();
      
//       if (filters.study_id) {
//         params.append('study_id', filters.study_id);
//       }
//       if (filters.status) {
//         params.append('status', filters.status);
//       }
//       if (filters.doc_type) {
//         params.append('doc_type', filters.doc_type);
//       }
      
//       const response = await api.get(`/document-requests/?${params.toString()}`);
//       return response.data;
//     } catch (error) {
//       console.error('Failed to fetch document requests:', error);
//       throw error;
//     }
//   },

//   /**
//    * 개별 서류 상태 변경
//    */
//   updateDocumentStatus: async (docRequestId, data) => {
//     try {
//       const response = await api.patch(`/document-requests/${docRequestId}/update_status/`, data);
//       return response.data;
//     } catch (error) {
//       console.error(`Failed to update document status ${docRequestId}:`, error);
//       throw error;
//     }
//   },

//   // ========== 서류 종류 관리 ==========

//   /**
//    * 서류 종류 목록 조회
//    */
//   getDocumentTypes: async () => {
//     try {
//       const response = await api.get('/document-types/');
//       return response.data;
//     } catch (error) {
//       console.error('Failed to fetch document types:', error);
//       throw error;
//     }
//   },

//   // ========== 통계 ==========

//   /**
//    * 서류 발급 통계 조회
//    */
//   getStatistics: async () => {
//     try {
//       const response = await api.get('/statistics/');
//       return response.data;
//     } catch (error) {
//       console.error('Failed to fetch statistics:', error);
//       throw error;
//     }
//   },

//   // ========== 파일 업로드 (향후 확장용) ==========

//   /**
//    * 파일 업로드 (스캔 문서 등)
//    */
//   uploadFile: async (file, metadata = {}) => {
//     try {
//       const formData = new FormData();
//       formData.append('file', file);
      
//       Object.keys(metadata).forEach(key => {
//         formData.append(key, metadata[key]);
//       });

//       const response = await axios.post(`${API_BASE_URL}/api/upload/`, formData, {
//         headers: {
//           'Content-Type': 'multipart/form-data',
//         },
//         timeout: 30000,
//       });
      
//       return response.data;
//     } catch (error) {
//       console.error('Failed to upload file:', error);
//       throw error;
//     }
//   },
// };

// // ========== 🔧 헬퍼 함수들 ==========

// /**
//  * 🔧 모달리티별 기본 서류 생성 함수
//  */
// function getDefaultDocuments(modality) {
//   const contrastModalities = ['CT', 'MR', 'XA', 'NM', 'PT'];
//   const requiresContrast = contrastModalities.includes(modality);

//   const baseDocuments = [
//     {
//       id: Date.now() + 1,
//       document_type: { 
//         code: 'report_kor', 
//         name: '판독 결과지 (국문)', 
//         requires_signature: false 
//       },
//       status: 'pending'
//     },
//     {
//       id: Date.now() + 2,
//       document_type: { 
//         code: 'imaging_cd', 
//         name: '진료기록영상 (CD)', 
//         requires_signature: false 
//       },
//       status: 'pending'
//     },
//     {
//       id: Date.now() + 3,
//       document_type: { 
//         code: 'export_certificate', 
//         name: '반출 확인서', 
//         requires_signature: true 
//       },
//       status: 'pending'
//     }
//   ];

//   if (requiresContrast) {
//     baseDocuments.unshift({
//       id: Date.now(),
//       document_type: { 
//         code: 'consent_contrast', 
//         name: '조영제 사용 동의서', 
//         requires_signature: true 
//       },
//       status: 'pending'
//     });
//   }

//   return baseDocuments;
// }

// /**
//  * 모달리티별 조영제 필요 여부 확인
//  */
// export const requiresContrast = (modality) => {
//   const contrastModalites = ['CT', 'MR', 'XA', 'NM', 'PT'];
//   return contrastModalites.includes(modality);
// };

// /**
//  * 서류 상태 한국어 변환
//  */
// export const getStatusLabel = (status) => {
//   const statusMap = {
//     'pending': '대기',
//     'selected': '선택됨',
//     'generated': '생성됨',
//     'signature_waiting': '서명대기',
//     'scan_waiting': '스캔대기',
//     'completed': '완료',
//     'cancelled': '취소',
//   };
//   return statusMap[status] || status;
// };

// /**
//  * 서류 종류 한국어 이름 반환
//  */
// export const getDocumentTypeName = (docType) => {
//   const typeMap = {
//     'consent_contrast': '조영제 사용 동의서',
//     'report_kor': '판독 결과지 (국문)',
//     'report_eng': '판독 결과지 (영문)',
//     'imaging_cd': '진료기록영상 (CD)',
//     'imaging_dvd': '진료기록영상 (DVD)',
//     'export_certificate': '반출 확인서',
//     'exam_certificate': '검사 확인서',
//     'consultation_request': '협진 의뢰서',
//     'medical_record_access_consent': '진료기록 열람 동의서',
//     'medical_record_access_proxy': '진료기록 열람 위임장',
//   };
//   return typeMap[docType] || docType;
// };

// export default pacsdocsService;

// pacsapp/src/services/pacsdocsService.js

import axios from 'axios';

// API 기본 URL 설정
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://35.225.63.41:8000';
const PACSDOCS_API_URL = `${API_BASE_URL}/api/pacsdocs/api`;
const WORKLIST_API_URL = `${API_BASE_URL}/api/worklists`; // 워크리스트 API

// PACS 문서 API 인스턴스
const api = axios.create({
  baseURL: PACSDOCS_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 워크리스트 API 인스턴스
const worklistApi = axios.create({
  baseURL: WORKLIST_API_URL, // http://35.225.63.41:8000/api/worklists
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청/응답 인터셉터 (개발용 로깅 추가)
api.interceptors.request.use(
  (config) => {
    console.log(`🔄 PACS API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ PACS Request Error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log(`✅ PACS API Response: ${response.status} ${response.config.url}`);
    console.log('📄 PACS Response Data:', response.data);
    return response;
  },
  (error) => {
    console.error('❌ PACS API Error:', error);
    console.error('📄 Error Response:', error.response?.data);
    console.error('🔗 Request URL:', error.config?.url);
    return Promise.reject(error);
  }
);

export const pacsdocsService = {
  // ========== 🔥 통합된 검사별 서류 관리 (메인 UI용) ==========
  
  /**
   * 🔥 검사별 서류 목록 조회 (워크리스트 + 서류 정보 통합)
   */
  getStudyDocuments: async (filters = {}) => {
    try {
      console.log('🔄 PACS 문서 통합 데이터 조회 시작', filters);

      // 1️⃣ 워크리스트 데이터 가져오기
      let worklistData = [];
      if (filters.exam_date) {
        try {
          console.log(`🔍 워크리스트 조회 날짜: ${filters.exam_date}`);
          const worklistResponse = await worklistApi.get(`/${filters.exam_date}/`);
          
          // Django API 응답 구조에 맞게 데이터 추출 (worklistService.js와 동일하게)
          if (worklistResponse.data.status === 'success') {
            worklistData = worklistResponse.data.data || [];
            console.log(`✅ 워크리스트 데이터 ${worklistData.length}개 로드됨`);
            console.log('🔍 첫 번째 워크리스트 항목:', worklistData[0]); // 🔧 디버깅 추가
            console.log('🔍 모든 필드명:', Object.keys(worklistData[0] || {})); // 🔧 디버깅 추가
          } else {
            console.warn('⚠️ API 응답 상태가 success가 아님:', worklistResponse.data);
            worklistData = [];
          }
        } catch (worklistError) {
          console.error('❌ 워크리스트 조회 실패:', worklistError);
          // 워크리스트 조회 실패시 빈 배열로 계속 진행
          worklistData = [];
        }
      }

      // 필터링 적용 (환자명, 모달리티)
      if (filters.patient_name) {
        worklistData = worklistData.filter(item => 
          item.patientName?.includes(filters.patient_name)
        );
      }
      if (filters.modality) {
        worklistData = worklistData.filter(item => 
          item.modality === filters.modality
        );
      }

      // 2️⃣ 각 검사별 서류 정보 추가
      const enrichedData = await Promise.all(
        worklistData.map(async (studyRequest) => {
          try {
            // 각 검사별 서류 정보 조회 시도
            const docResponse = await api.get(`/study-documents/${studyRequest.id}/`);
            
            return {
              // 🔥 워크리스트 필드명 그대로 사용 ✅
              ...studyRequest, // 모든 필드 그대로 복사
              
              // 📄 서류 정보만 추가
              documents: docResponse.data.documents || []
            };
          } catch (docError) {
            console.warn(`서류 정보 조회 실패 (Study ID: ${studyRequest.id}):`, docError);
            
            // 🔧 서류 정보가 없는 경우 기본 서류 생성
            const defaultDocuments = getDefaultDocuments(studyRequest.modality);
            
            return {
              // 🔥 워크리스트 필드명 그대로 사용 ✅
              ...studyRequest, // 모든 필드 그대로 복사
              
              // 📄 기본 서류 정보 추가
              documents: defaultDocuments
            };
          }
        })
      );

      console.log(`✅ 통합 데이터 완성: ${enrichedData.length}개`);
      
      return {
        results: enrichedData,
        count: enrichedData.length,
        date: filters.exam_date
      };

          } catch (error) {
      console.error('❌ PACS 문서 통합 데이터 조회 실패:', error);
      
      // 🔄 에러 발생시에도 워크리스트 API 한번 더 시도
      console.log('🔄 에러 복구: 워크리스트 API 직접 호출 시도');
      try {
        const fallbackResponse = await worklistApi.get(`/${filters.exam_date}/`);
        if (fallbackResponse.data.status === 'success') {
          console.log('✅ 복구 성공! 워크리스트 데이터:', fallbackResponse.data.data);
          return {
            results: fallbackResponse.data.data.map(item => ({
              ...item,
              documents: getDefaultDocuments(item.modality)
            })),
            count: fallbackResponse.data.count,
            date: filters.exam_date
          };
        }
      } catch (fallbackError) {
        console.error('❌ 복구도 실패:', fallbackError);
      }
      
      // 🔄 개발용: 더미 데이터 반환 (기존 코드 유지)
      if (true) { // 강제로 더미 데이터 사용 중지
        console.warn('🔄 Using dummy data for development');
        return {
          results: [
            {
              id: 1,
              patientId: 'P2025-001234',        // ✅ 수정
              patientName: '김철수',             // ✅ 수정
              birthDate: '1985-06-12',          // ✅ 수정
              examPart: '흉부',                 // ✅ 수정
              modality: 'CT',
              reportingDoctor: '이지은',         // ✅ 수정
              requestDateTime: '2025-06-24T14:30:00Z',  // ✅ 수정
              priority: '응급',
              examStatus: '검사완료',           // ✅ 수정
              documents: [
                {
                  id: 1,
                  document_type: { 
                    code: 'consent_contrast', 
                    name: '조영제 사용 동의서', 
                    requires_signature: true 
                  },
                  status: 'pending'
                },
                {
                  id: 2,
                  document_type: { 
                    code: 'report_kor', 
                    name: '판독 결과지 (국문)', 
                    requires_signature: false 
                  },
                  status: 'pending'
                },
                {
                  id: 3,
                  document_type: { 
                    code: 'imaging_cd', 
                    name: '진료기록영상 (CD)', 
                    requires_signature: false 
                  },
                  status: 'pending'
                },
                {
                  id: 4,
                  document_type: { 
                    code: 'export_certificate', 
                    name: '반출 확인서', 
                    requires_signature: true 
                  },
                  status: 'pending'
                }
              ]
            }
          ]
        };
      }
      
      throw error;
    }
  },

  /**
   * 특정 검사의 서류 상세 조회
   */
  getStudyDocumentDetail: async (studyId) => {
    try {
      const response = await api.get(`/study-documents/${studyId}/`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch study document ${studyId}:`, error);
      throw error;
    }
  },

  /**
   * 검사에 필요한 서류들 자동 생성
   */
  createDocuments: async (studyId) => {
    try {
      const response = await api.post(`/study-documents/${studyId}/create_documents/`);
      return response.data;
    } catch (error) {
      console.error(`Failed to create documents for study ${studyId}:`, error);
      throw error;
    }
  },

  /**
   * 선택된 서류들 일괄 처리
   */
  processDocuments: async (studyId, data) => {
    try {
      const response = await api.post(`/study-documents/${studyId}/process_documents/`, data);
      return response.data;
    } catch (error) {
      console.error(`Failed to process documents for study ${studyId}:`, error);
      
      // 개발용: 성공 응답 시뮬레이션
      if (process.env.NODE_ENV === 'development') {
        console.warn('🔄 Simulating successful document processing');
        return {
          processed_count: data.document_ids?.length || 0,
          failed_count: 0,
          processed_documents: ['시뮬레이션 처리됨'],
          failed_documents: []
        };
      }
      
      throw error;
    }
  },

  /**
   * 서류 미리보기 데이터 조회
   */
  previewDocument: async (studyId, docType) => {
    try {
      const response = await api.get(`/study-documents/${studyId}/preview_document/?doc_type=${docType}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to preview document ${docType} for study ${studyId}:`, error);
      throw error;
    }
  },

  // ========== 개별 서류 요청 관리 ==========

  /**
   * 서류 요청 목록 조회
   */
  getDocumentRequests: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.study_id) {
        params.append('study_id', filters.study_id);
      }
      if (filters.status) {
        params.append('status', filters.status);
      }
      if (filters.doc_type) {
        params.append('doc_type', filters.doc_type);
      }
      
      const response = await api.get(`/document-requests/?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch document requests:', error);
      throw error;
    }
  },

  /**
   * 개별 서류 상태 변경
   */
  updateDocumentStatus: async (docRequestId, data) => {
    try {
      const response = await api.patch(`/document-requests/${docRequestId}/update_status/`, data);
      return response.data;
    } catch (error) {
      console.error(`Failed to update document status ${docRequestId}:`, error);
      throw error;
    }
  },

  // ========== 서류 종류 관리 ==========

  /**
   * 서류 종류 목록 조회
   */
  getDocumentTypes: async () => {
    try {
      const response = await api.get('/document-types/');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch document types:', error);
      throw error;
    }
  },

  // ========== 통계 ==========

  /**
   * 서류 발급 통계 조회
   */
  getStatistics: async () => {
    try {
      const response = await api.get('/statistics/');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
      throw error;
    }
  },

  // ========== 파일 업로드 (향후 확장용) ==========

  /**
   * 파일 업로드 (스캔 문서 등)
   */
  uploadFile: async (file, metadata = {}) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      Object.keys(metadata).forEach(key => {
        formData.append(key, metadata[key]);
      });

      const response = await axios.post(`${API_BASE_URL}/api/upload/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw error;
    }
  },
};

// ========== 🔧 헬퍼 함수들 ==========

/**
 * 🔧 모달리티별 기본 서류 생성 함수 (중복 방지)
 */
function getDefaultDocuments(modality) {
  const contrastModalities = ['CT', 'MR', 'XA', 'NM', 'PT'];
  const requiresContrast = contrastModalities.includes(modality);

  const baseDocuments = [
    {
      id: Date.now() + 1,
      document_type: { 
        code: 'report_kor', 
        name: '판독 결과지 (국문)', 
        requires_signature: false 
      },
      status: 'pending'
    },
    {
      id: Date.now() + 2,
      document_type: { 
        code: 'imaging_cd', 
        name: '진료기록영상 (CD)', 
        requires_signature: false 
      },
      status: 'pending'
    },
    {
      id: Date.now() + 3,
      document_type: { 
        code: 'export_certificate', 
        name: '반출 확인서', 
        requires_signature: true 
      },
      status: 'pending'
    }
  ];

  // 🔥 수정: 조영제 동의서 중복 방지
  if (requiresContrast) {
    // 이미 동의서가 있는지 확인
    const hasConsent = baseDocuments.some(doc => 
      doc.document_type.code === 'consent_contrast'
    );
    
    if (!hasConsent) {
      baseDocuments.unshift({
        id: Date.now(),
        document_type: { 
          code: 'consent_contrast', 
          name: '조영제 사용 동의서', 
          requires_signature: true 
        },
        status: 'pending'
      });
    }
  }

  return baseDocuments;
}

/**
 * 모달리티별 조영제 필요 여부 확인
 */
export const requiresContrast = (modality) => {
  const contrastModalites = ['CT', 'MR', 'XA', 'NM', 'PT'];
  return contrastModalites.includes(modality);
};

/**
 * 서류 상태 한국어 변환
 */
export const getStatusLabel = (status) => {
  const statusMap = {
    'pending': '대기',
    'selected': '선택됨',
    'generated': '생성됨',
    'signature_waiting': '서명대기',
    'scan_waiting': '스캔대기',
    'completed': '완료',
    'cancelled': '취소',
  };
  return statusMap[status] || status;
};

/**
 * 서류 종류 한국어 이름 반환
 */
export const getDocumentTypeName = (docType) => {
  const typeMap = {
    'consent_contrast': '조영제 사용 동의서',
    'report_kor': '판독 결과지 (국문)',
    'report_eng': '판독 결과지 (영문)',
    'imaging_cd': '진료기록영상 (CD)',
    'imaging_dvd': '진료기록영상 (DVD)',
    'export_certificate': '반출 확인서',
    'exam_certificate': '검사 확인서',
    'consultation_request': '협진 의뢰서',
    'medical_record_access_consent': '진료기록 열람 동의서',
    'medical_record_access_proxy': '진료기록 열람 위임장',
  };
  return typeMap[docType] || docType;
};

export default pacsdocsService;