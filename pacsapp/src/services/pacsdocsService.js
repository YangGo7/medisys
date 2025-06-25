// pacsapp/src/services/pacsdocsService.js

import axios from 'axios';

// API 기본 URL 설정
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const PACSDOCS_API_URL = `${API_BASE_URL}/api/pacsdocs/api`;

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: PACSDOCS_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청/응답 인터셉터 (에러 처리용)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export const pacsdocsService = {
  // ========== 검사별 서류 관리 (메인 UI용) ==========
  
  /**
   * 검사별 서류 목록 조회 (필터링 지원)
   * @param {Object} filters - 필터 조건
   * @param {string} filters.exam_date - 검사 날짜 (YYYY-MM-DD)
   * @param {string} filters.patient_name - 환자명
   * @param {string} filters.modality - 모달리티 (CT, MR, CR, etc.)
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
      
      const response = await api.get(`/study-documents/?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch study documents:', error);
      throw error;
    }
  },

  /**
   * 특정 검사의 서류 상세 조회
   * @param {number} studyId - 검사 ID
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
   * @param {number} studyId - 검사 ID
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
   * @param {number} studyId - 검사 ID
   * @param {Object} data - 처리 데이터
   * @param {number[]} data.document_ids - 처리할 서류 ID 배열
   * @param {string} data.action - 액션 타입 ('select', 'generate', 'complete', 'cancel')
   * @param {string} data.processed_by - 처리자
   * @param {string} data.notes - 비고
   */
  processDocuments: async (studyId, data) => {
    try {
      const response = await api.post(`/study-documents/${studyId}/process_documents/`, data);
      return response.data;
    } catch (error) {
      console.error(`Failed to process documents for study ${studyId}:`, error);
      throw error;
    }
  },

  /**
   * 서류 미리보기 데이터 조회
   * @param {number} studyId - 검사 ID
   * @param {string} docType - 서류 종류 코드
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
   * @param {Object} filters - 필터 조건
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
   * @param {number} docRequestId - 서류 요청 ID
   * @param {Object} data - 상태 변경 데이터
   * @param {string} data.status - 새로운 상태
   * @param {string} data.processed_by - 처리자
   * @param {string} data.notes - 비고
   * @param {string} data.file_path - 파일 경로
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
   * @param {File} file - 업로드할 파일
   * @param {Object} metadata - 파일 메타데이터
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
        timeout: 30000, // 파일 업로드는 시간이 더 걸릴 수 있음
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
 * @param {string} modality - 모달리티 코드
 * @returns {boolean} 조영제 필요 여부
 */
export const requiresContrast = (modality) => {
  const contrastModalites = ['CT', 'MR', 'XA', 'NM', 'PT'];
  return contrastModalites.includes(modality);
};

/**
 * 서류 상태 한국어 변환
 * @param {string} status - 영문 상태
 * @returns {string} 한국어 상태
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
 * @param {string} docType - 서류 종류 코드
 * @returns {string} 한국어 서류명
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