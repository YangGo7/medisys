// frontend/src/pacsapp/components/WorkList/WorkList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const WorkList = ({ onStudySelect }) => {
  const [workList, setWorkList] = useState([]);
  const [filteredWorkList, setFilteredWorkList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    patientId: '',
    patientName: '',
    modality: '',
    bodyPart: '',
    requestingPhysician: '',
    studyStatus: '',
    reportStatus: ''
  });

  const navigate = useNavigate();
  const API_BASE_URL = 'http://35.225.63.41:8000/api';

  useEffect(() => {
    fetchWorkList();
  }, []);

  const fetchWorkList = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 🔥 수정: 올바른 엔드포인트 사용
      const response = await fetch(`${API_BASE_URL}/worklist/work-list/`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('받은 데이터:', result);
      
      // 🔥 수정: Django work_list 함수의 응답 구조에 맞게 처리
      if (result.status === 'success' && result.data && Array.isArray(result.data)) {
        setWorkList(result.data);
        setFilteredWorkList(result.data);
      } else {
        console.error('예상과 다른 데이터 구조:', result);
        setWorkList([]);
        setFilteredWorkList([]);
      }
      
    } catch (err) {
      console.error('API 호출 에러:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 분석 버튼 클릭 핸들러 - OHIF + AI 분석 페이지로 이동
  const handleAnalyzeStudy = async (studyItem) => {
    try {
      console.log('🚀 분석 시작:', studyItem);
      
      // 1. WorkList ID를 기반으로 매핑된 DICOM Studies 조회
      const patientMappingResponse = await fetch(
        `${API_BASE_URL}/integration/worklist/${studyItem.id}/mapped-studies/`
      );
      
      if (!patientMappingResponse.ok) {
        alert('환자의 DICOM 데이터를 찾을 수 없습니다.');
        return;
      }
      
      const mappingData = await patientMappingResponse.json();
      
      if (!mappingData.success || !mappingData.studies || mappingData.studies.length === 0) {
        alert('해당 환자의 DICOM 영상이 없습니다. 먼저 DICOM 파일을 업로드해주세요.');
        return;
      }
      
      // 2. 가장 최근 Study 선택
      const latestStudy = mappingData.studies[0];
      const studyUID = latestStudy.study_instance_uid;
      
      if (!studyUID) {
        alert('Study UID를 찾을 수 없습니다.');
        return;
      }
      
      // 3. AI 분석 페이지로 이동 (studyUID와 환자 정보 전달)
      navigate('/analysis', {
        state: {
          studyUID: studyUID,
          patientInfo: {
            patient_id: studyItem.patient_id,
            patient_name: studyItem.patient_name,
            modality: studyItem.modality,
            body_part: studyItem.body_part,
            request_id: studyItem.id
          },
          dicomStudies: mappingData.studies,
          worklistItem: studyItem
        }
      });
      
    } catch (error) {
      console.error('분석 시작 실패:', error);
      alert('분석을 시작할 수 없습니다: ' + error.message);
    }
  };

  // 필터 적용 함수
  const applyFilters = () => {
    const filtered = workList.filter(item => {
      return (
        (filters.patientId === '' || item.patient_id.includes(filters.patientId)) &&
        (filters.patientName === '' || item.patient_name.toLowerCase().includes(filters.patientName.toLowerCase())) &&
        (filters.modality === '' || item.modality === filters.modality) &&
        (filters.bodyPart === '' || item.body_part?.toLowerCase().includes(filters.bodyPart.toLowerCase())) &&
        (filters.requestingPhysician === '' || item.requesting_physician?.toLowerCase().includes(filters.requestingPhysician.toLowerCase())) &&
        (filters.studyStatus === '' || item.study_status === filters.studyStatus) &&
        (filters.reportStatus === '' || item.report_status === filters.reportStatus)
      );
    });
    setFilteredWorkList(filtered);
  };

  // 필터 초기화 함수
  const clearFilters = () => {
    setFilters({
      patientId: '',
      patientName: '',
      modality: '',
      bodyPart: '',
      requestingPhysician: '',
      studyStatus: '',
      reportStatus: ''
    });
    setFilteredWorkList(workList);
  };

  // 필터 변경 시 자동 적용
  useEffect(() => {
    applyFilters();
  }, [filters, workList]);

  // 고유 값들 추출 (드롭다운용)
  const uniqueModalities = [...new Set(workList.map(item => item.modality).filter(Boolean))];
  const uniqueBodyParts = [...new Set(workList.map(item => item.body_part).filter(Boolean))];
  const uniqueStatuses = [...new Set(workList.map(item => item.study_status).filter(Boolean))];
  const uniqueReportStatuses = [...new Set(workList.map(item => item.report_status).filter(Boolean))];

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR');
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'requested': { text: '요청됨', color: '#3498db', bg: '#e3f2fd' },
      'scheduled': { text: '예약됨', color: '#f39c12', bg: '#fff3cd' },
      'in_progress': { text: '진행중', color: '#e67e22', bg: '#ffeaa7' },
      'completed': { text: '완료됨', color: '#27ae60', bg: '#d4edda' },
      'cancelled': { text: '취소됨', color: '#e74c3c', bg: '#f8d7da' }
    };
    
    const statusInfo = statusMap[status] || { text: status, color: '#6c757d', bg: '#f8f9fa' };
    
    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 'bold',
        backgroundColor: statusInfo.bg,
        color: statusInfo.color
      }}>
        {statusInfo.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#6c757d' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
        <p style={{ fontSize: '18px' }}>워크리스트를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#e74c3c' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
        <p style={{ fontSize: '18px', marginBottom: '20px' }}>오류: {error}</p>
        <button onClick={fetchWorkList} style={{
          padding: '10px 20px',
          backgroundColor: '#3498db',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}>
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {/* 헤더 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '30px',
        borderBottom: '2px solid #3498db',
        paddingBottom: '15px'
      }}>
        <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '28px', fontWeight: 'bold' }}>
          📋 워크리스트 관리
        </h2>
        <button 
          onClick={fetchWorkList}
          style={{
            padding: '8px 16px',
            backgroundColor: '#27ae60',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'all 0.3s'
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#219a52'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#27ae60'}
        >
          🔄 새로고침
        </button>
      </div>

      {/* 필터 섹션 */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #dee2e6'
      }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#495057' }}>🔍 검색 필터</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <input
            type="text"
            placeholder="환자 ID"
            value={filters.patientId}
            onChange={(e) => setFilters({ ...filters, patientId: e.target.value })}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="환자 이름"
            value={filters.patientName}
            onChange={(e) => setFilters({ ...filters, patientName: e.target.value })}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
          <select
            value={filters.modality}
            onChange={(e) => setFilters({ ...filters, modality: e.target.value })}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          >
            <option value="">모든 모달리티</option>
            {uniqueModalities.map(modality => (
              <option key={modality} value={modality}>{modality}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="검사 부위"
            value={filters.bodyPart}
            onChange={(e) => setFilters({ ...filters, bodyPart: e.target.value })}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
          <input
            type="text"
            placeholder="요청 의사"
            value={filters.requestingPhysician}
            onChange={(e) => setFilters({ ...filters, requestingPhysician: e.target.value })}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          />
          <select
            value={filters.studyStatus}
            onChange={(e) => setFilters({ ...filters, studyStatus: e.target.value })}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          >
            <option value="">모든 검사 상태</option>
            {uniqueStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select
            value={filters.reportStatus}
            onChange={(e) => setFilters({ ...filters, reportStatus: e.target.value })}
            style={{ padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
          >
            <option value="">모든 리포트 상태</option>
            {uniqueReportStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <button
            onClick={clearFilters}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🗑️ 필터 초기화
          </button>
        </div>
      </div>

      {/* 통계 정보 */}
      <div style={{
        display: 'flex',
        gap: '15px',
        marginBottom: '20px'
      }}>
        <div style={{
          backgroundColor: '#e3f2fd',
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'center',
          flex: 1
        }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>
            {filteredWorkList.length}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>총 검사 건수</div>
        </div>
      </div>

      {/* 테이블 */}
      {filteredWorkList.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 40px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '10px',
          border: '2px dashed #dee2e6'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📋</div>
          <p style={{ fontSize: '18px', color: '#6c757d', margin: 0 }}>
            {workList.length === 0 ? '등록된 검사 요청이 없습니다.' : '검색 조건에 맞는 검사 요청이 없습니다.'}
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #dee2e6', borderRadius: '8px' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            backgroundColor: 'white',
            fontSize: '13px'
          }}>
            <thead style={{ backgroundColor: '#495057', color: 'white' }}>
              <tr>
                <th style={{ padding: '12px 8px', border: '1px solid #34495e', minWidth: '60px' }}>ID</th>
                <th style={{ padding: '12px 8px', border: '1px solid #34495e', minWidth: '100px' }}>환자번호</th>
                <th style={{ padding: '12px 8px', border: '1px solid #34495e', minWidth: '120px' }}>환자명</th>
                <th style={{ padding: '12px 8px', border: '1px solid #34495e', minWidth: '100px' }}>생년월일</th>
                <th style={{ padding: '12px 8px', border: '1px solid #34495e', minWidth: '60px' }}>성별</th>
                <th style={{ padding: '12px 8px', border: '1px solid #34495e', minWidth: '80px' }}>검사부위</th>
                <th style={{ padding: '12px 8px', border: '1px solid #34495e', minWidth: '80px' }}>모달리티</th>
                <th style={{ padding: '12px 8px', border: '1px solid #34495e', minWidth: '120px' }}>요청의사</th>
                <th style={{ padding: '12px 8px', border: '1px solid #34495e', minWidth: '180px' }}>요청일시</th>
                <th style={{ padding: '12px 8px', border: '1px solid #34495e', minWidth: '180px' }}>검사일시</th>
                <th style={{ padding: '12px 8px', border: '1px solid #34495e', minWidth: '120px' }}>판독의사</th>
                <th style={{ padding: '12px 8px', border: '1px solid #34495e', minWidth: '200px' }}>Study UID</th>
                <th style={{ padding: '12px 8px', border: '1px solid #34495e', minWidth: '150px' }}>Accession Number</th>
                <th style={{ padding: '12px 8px', border: '1px solid #34495e', minWidth: '100px' }}>검사상태</th>
                <th style={{ padding: '12px 8px', border: '1px solid #34495e', minWidth: '100px' }}>리포트상태</th>
                <th style={{ padding: '12px 8px', border: '1px solid #34495e', minWidth: '120px' }}>🔬 AI 분석</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkList.map((item, index) => (
                <tr
                  key={item.id}
                  style={{
                    backgroundColor: index % 2 === 0 ? '#f8f9fa' : '#fff',
                    transition: 'background-color 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e3f2fd'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#f8f9fa' : '#fff'}
                  onClick={() => onStudySelect && onStudySelect(item.id)}
                  title="클릭하여 상세 정보 보기"
                >
                  <td style={{ padding: '12px 10px', border: '1px solid #dee2e6', textAlign: 'center', fontWeight: 'bold' }}>{item.id}</td>
                  <td style={{ padding: '12px 10px', border: '1px solid #dee2e6', textAlign: 'center', fontWeight: 'bold' }}>{item.patient_id}</td>
                  <td style={{ padding: '12px 10px', border: '1px solid #dee2e6', textAlign: 'center', fontWeight: 'bold' }}>{item.patient_name}</td>
                  <td style={{ padding: '12px 10px', border: '1px solid #dee2e6', textAlign: 'center' }}>{formatDate(item.birth_date)}</td>
                  <td style={{ padding: '12px 10px', border: '1px solid #dee2e6', textAlign: 'center' }}>{item.sex === 'M' ? '남성' : item.sex === 'F' ? '여성' : item.sex}</td>
                  <td style={{ padding: '12px 10px', border: '1px solid #dee2e6', textAlign: 'center' }}>{item.body_part}</td>
                  <td style={{ padding: '12px 10px', border: '1px solid #dee2e6', textAlign: 'center', fontWeight: 'bold' }}>{item.modality}</td>
                  <td style={{ padding: '12px 10px', border: '1px solid #dee2e6', textAlign: 'center' }}>{item.requesting_physician}</td>
                  <td style={{ padding: '12px 10px', border: '1px solid #dee2e6', textAlign: 'center', fontSize: '12px' }}>{formatDateTime(item.request_datetime)}</td>
                  <td style={{ padding: '12px 10px', border: '1px solid #dee2e6', textAlign: 'center', fontSize: '12px' }}>{formatDateTime(item.scheduled_exam_datetime)}</td>
                  <td style={{ padding: '12px 10px', border: '1px solid #dee2e6', textAlign: 'center' }}>{item.interpreting_physician || '-'}</td>
                  <td style={{ padding: '12px 10px', border: '1px solid #dee2e6', textAlign: 'center', fontSize: '10px', wordBreak: 'break-all' }}>{item.study_uid || '-'}</td>
                  <td style={{ padding: '12px 10px', border: '1px solid #dee2e6', textAlign: 'center' }}>{item.accession_number || '-'}</td>
                  <td style={{ padding: '12px 10px', border: '1px solid #dee2e6', textAlign: 'center' }}>{getStatusBadge(item.study_status)}</td>
                  <td style={{ padding: '12px 10px', border: '1px solid #dee2e6', textAlign: 'center' }}>{getStatusBadge(item.report_status)}</td>
                  <td style={{ padding: '12px 10px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                    {/* 🔥 AI 분석 버튼 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // 행 클릭 이벤트 방지
                        handleAnalyzeStudy(item);
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#17a2b8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        transition: 'all 0.3s'
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = '#138496'}
                      onMouseOut={(e) => e.target.style.backgroundColor = '#17a2b8'}
                      title="AI 분석 시작"
                    >
                      🔬 분석
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WorkList;