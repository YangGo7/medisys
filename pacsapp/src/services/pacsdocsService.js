// pacsapp/src/services/pacsdocsService.js

import axios from 'axios';

// API 기본 URL 설정 (올바른 URL 구조)
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://35.225.63.41:8000';
const PACSDOCS_API_URL = `${API_BASE_URL}/api/pacsdocs/api`; // ✅ 이미 올바름

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: PACSDOCS_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청/응답 인터셉터 (개발용 로깅 추가)
api.interceptors.request.use(
  (config) => {
    console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    console.log('📄 Response Data:', response.data);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error);
    console.error('📄 Error Response:', error.response?.data);
    console.error('🔗 Request URL:', error.config?.url);
    return Promise.reject(error);
  }
);

export const pacsdocsService = {
  // ========== 검사별 서류 관리 (메인 UI용) ==========
  
  /**
   * 검사별 서류 목록 조회 (필터링 지원)
   */
  getStudyDocuments: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      
      if (filters.exam_date) {
        params.append('exam_date', filters.exam_date);
      }
      if (filters.patient_name) {
        params.append('patient_name', filters.patient_name);
      }
      if (filters.modality) {
        params.append('modality', filters.modality);
      }
      
      const url = `/study-documents/${params.toString() ? '?' + params.toString() : ''}`;
      console.log(`🔍 Fetching study documents with URL: ${PACSDOCS_API_URL}${url}`);
      
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch study documents:', error);
      
      // 개발용: 더미 데이터 반환
      if (process.env.NODE_ENV === 'development') {
        console.warn('🔄 Using dummy data for development');
        return {
          results: [
            {
              id: 1,
              patient_id: 'P2025-001234',
              patient_name: '김철수',
              birth_date: '1985-06-12',
              body_part: '흉부',
              modality: 'CT',
              interpreting_physician: '이지은',
              request_datetime: '2025-06-24T14:30:00Z',
              priority: '응급',
              study_status: '검사완료',
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

// ========== 헬퍼 함수들 ==========

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