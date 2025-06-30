// src/hooks/useReports.js
import { useState, useCallback } from 'react';
import { saveReport, loadReport, deleteReport, updateReportStatus } from '../utils/api';

/**
 * 레포트 관련 상태와 로직을 관리하는 커스텀 훅
 * @param {string} currentStudyUID - 현재 선택된 스터디 UID
 * @param {Function} getCurrentStudyInfo - 현재 스터디 정보를 가져오는 함수
 * @returns {Object} 레포트 관련 상태와 함수들
 */
const useReports = (currentStudyUID, getCurrentStudyInfo) => {
    // =============================================================================
    // 상태 관리
    // =============================================================================
    
    // 레포트 모달 상태
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportContent, setReportContent] = useState('');
    
    // 레포트 목록 및 드롭다운
    const [reportSummaries, setReportSummaries] = useState([]);
    const [showReportDropdown, setShowReportDropdown] = useState(false);
    
    // 로딩 상태
    const [isLoading, setIsLoading] = useState(false);
    
    // =============================================================================
    // 레포트 저장 관련 함수들
    // =============================================================================
    
    /**
     * 레포트를 서버에 저장하는 함수
     */
    const saveReportToServer = useCallback(async (content = reportContent) => {
        if (!currentStudyUID) {
            alert('Study UID를 찾을 수 없습니다.');
            return false;
        }
        
        try {
            setIsLoading(true);
            
            const studyInfo = getCurrentStudyInfo();
            const result = await saveReport(
                currentStudyUID,
                studyInfo.patient_id,
                content,
                'draft'
            );
            
            if (result.status === 'success') {
                // 👈 실제 판독의 이름 포함한 알림
                const doctorName = result.data?.doctor_name || '';
                const doctorInfo = doctorName ? ` (판독의: ${doctorName})` : '';
                alert(`✅ 레포트가 저장되었습니다!${doctorInfo}`);
                
                setShowReportModal(false);
                setReportContent('');
                
                // 레포트 목록 갱신
                await refreshReportSummaries();
                return true;
            } else {
                alert('❌ 레포트 저장 실패: ' + result.message);
                return false;
            }
        } catch (error) {
            alert('❌ 레포트 저장 실패: ' + error.message);
            console.error('❌ 레포트 저장 에러:', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [currentStudyUID, reportContent, getCurrentStudyInfo]);
    
    /**
     * 서버에서 레포트를 불러오는 함수
     */
    const loadReportFromServer = useCallback(async () => {
        if (!currentStudyUID) {
            alert('Study UID를 찾을 수 없습니다.');
            return false;
        }
        
        try {
            setIsLoading(true);
            
            const data = await loadReport(currentStudyUID);
            
            if (data.status === 'success') {
                setReportContent(data.report.dr_report || '');
                // 👈 실제 판독의 이름 포함한 알림
                const doctorName = data.report?.doctor_name || '';
                const doctorInfo = doctorName ? ` (판독의: ${doctorName})` : '';
                alert(`✅ 레포트를 불러왔습니다!${doctorInfo}`);
                return true;
            } else {
                alert('저장된 레포트가 없습니다.');
                return false;
            }
        } catch (error) {
            alert('❌ 레포트 불러오기 실패: ' + error.message);
            console.error('❌ 레포트 불러오기 에러:', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [currentStudyUID]);
    
    /**
     * 서버에서 레포트를 삭제하는 함수
     */
    const deleteReportFromServer = useCallback(async () => {
        if (!currentStudyUID) {
            alert('Study UID를 찾을 수 없습니다.');
            return false;
        }
        
        if (!window.confirm('이 레포트를 삭제하시겠습니까?')) {
            return false;
        }
        
        try {
            setIsLoading(true);
            
            const data = await deleteReport(currentStudyUID);
            
            if (data.status === 'success') {
                alert('✅ 레포트가 삭제되었습니다!');
                setReportSummaries([]); // 드롭다운에서 제거
                setReportContent(''); // 내용 초기화
                return true;
            } else {
                alert('❌ 레포트 삭제 실패: ' + data.message);
                return false;
            }
        } catch (error) {
            alert('❌ 레포트 삭제 실패: ' + error.message);
            console.error('❌ 레포트 삭제 에러:', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [currentStudyUID]);
    
    // =============================================================================
    // 레포트 상태 관리 함수들
    // =============================================================================
    
    /**
     * 레포트 상태를 업데이트하는 함수
     * @param {string} studyUID - 스터디 UID
     * @param {string} status - 새로운 상태 ('draft', 'completed', 'approved')
     */
    const updateReportStatusOnServer = useCallback(async (studyUID, status) => {
        try {
            setIsLoading(true);
            
            const data = await updateReportStatus(studyUID, status);
            
            if (data.status === 'success') {
                // 레포트 목록 다시 불러오기
                await refreshReportSummaries();
                return true;
            } else {
                alert('❌ 상태 업데이트 실패: ' + data.message);
                return false;
            }
        } catch (error) {
            alert('❌ 상태 업데이트 실패: ' + error.message);
            console.error('❌ 상태 업데이트 에러:', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    // =============================================================================
    // 레포트 목록 관리 함수들
    // =============================================================================
    
    /**
     * 레포트 요약 목록을 새로고침하는 함수
     */
    const refreshReportSummaries = useCallback(async () => {
        if (!currentStudyUID) return [];
        
        try {
            const data = await loadReport(currentStudyUID);
            
            if (data.status === 'success') {
                const summaries = [data.report];
                setReportSummaries(summaries);
                return summaries;
            } else {
                setReportSummaries([]);
                return [];
            }
        } catch (error) {
            console.error('❌ 레포트 목록 새로고침 실패:', error);
            setReportSummaries([]);
            return [];
        }
    }, [currentStudyUID]);
    
    /**
     * 드롭다운에서 레포트를 선택했을 때의 핸들러
     * @param {Object} report - 선택된 레포트 객체
     */
    const selectReportFromDropdown = useCallback((report) => {
        setReportContent(report.dr_report || '');
        setShowReportDropdown(false);
        setShowReportModal(true);
    }, []);
    
    // =============================================================================
    // UI 토글 및 모달 관리 함수들
    // =============================================================================
    
    /**
     * 레포트 모달을 여는 함수
     */
    const openReportModal = useCallback(() => {
        setShowReportModal(true);
    }, []);
    
    /**
     * 레포트 모달을 닫는 함수
     */
    const closeReportModal = useCallback(() => {
        setShowReportModal(false);
        setReportContent('');
    }, []);
    
    /**
     * 레포트 드롭다운을 토글하는 함수
     */
    const toggleReportDropdown = useCallback(async () => {
        if (!showReportDropdown) {
            // 드롭다운 열 때만 해당 study의 레포트 확인
            await refreshReportSummaries();
        }
        setShowReportDropdown(prev => !prev);
    }, [showReportDropdown, refreshReportSummaries]);
    
    // =============================================================================
    // 인쇄 관련 함수들
    // =============================================================================
    
    /**
     * 레포트를 인쇄하는 함수
     */
    const printReport = useCallback(() => {
        window.print();
    }, []);
    
    /**
     * 레포트를 PDF로 저장하는 함수 (브라우저 기본 기능 사용)
     */
    const exportReportToPDF = useCallback(() => {
        // 브라우저의 인쇄 대화상자에서 PDF 저장 옵션 사용
        window.print();
    }, []);
    
    // =============================================================================
    // 유틸리티 함수들
    // =============================================================================
    
    /**
     * 레포트 내용이 변경되었는지 확인하는 함수
     * @param {string} originalContent - 원본 내용
     * @returns {boolean} 변경 여부
     */
    const hasReportChanged = useCallback((originalContent = '') => {
        return reportContent.trim() !== originalContent.trim();
    }, [reportContent]);
    
    /**
     * 레포트 상태를 초기화하는 함수
     */
    const resetReportState = useCallback(() => {
        setShowReportModal(false);
        setReportContent('');
        setReportSummaries([]);
        setShowReportDropdown(false);
        setIsLoading(false);
    }, []);
    
    /**
     * 레포트 유효성을 검사하는 함수
     * @returns {Object} 유효성 검사 결과
     */
    const validateReport = useCallback(() => {
        const content = reportContent.trim();
        
        if (!content) {
            return { isValid: false, message: '레포트 내용을 입력해주세요.' };
        }
        
        if (content.length < 10) {
            return { isValid: false, message: '레포트 내용이 너무 짧습니다.' };
        }
        
        if (content.length > 5000) {
            return { isValid: false, message: '레포트 내용이 너무 깁니다. (최대 5000자)' };
        }
        
        return { isValid: true, message: '' };
    }, [reportContent]);
    
    // =============================================================================
    // 반환값
    // =============================================================================
    
    return {
        // 상태
        showReportModal,
        reportContent,
        reportSummaries,
        showReportDropdown,
        isLoading,
        
        // 레포트 CRUD
        saveReportToServer,
        loadReportFromServer,
        deleteReportFromServer,
        
        // 상태 관리
        updateReportStatusOnServer,
        refreshReportSummaries,
        
        // UI 관리
        openReportModal,
        closeReportModal,
        toggleReportDropdown,
        selectReportFromDropdown,
        
        // 인쇄
        printReport,
        exportReportToPDF,
        
        // 유틸리티
        hasReportChanged,
        validateReport,
        resetReportState,
        
        // 상태 설정 함수들 (필요한 경우)
        setReportContent,
        setShowReportModal,
        setReportSummaries,
        setShowReportDropdown
    };
};

export default useReports;