// frontend/src/components/RIS/RealDicomViewer.jsx

import React, { useState, useEffect } from 'react';
import CornerstoneViewer from './CornerstoneViewer';
import ReportPanel from './ReportPanel';

const RealDicomViewer = () => {
  // 상태 관리
  const [completedStudies, setCompletedStudies] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientStudies, setPatientStudies] = useState([]);
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 뷰 모드 (list: 환자 목록, viewer: 통합 뷰어)
  const [viewMode, setViewMode] = useState('list');
  
  // 뷰어 레이아웃 (split: 분할, viewer: 이미지만, report: 리포트만)
  const [viewerLayout, setViewerLayout] = useState('split');

  // API 기본 URL - 중복 /api/ 제거
  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://35.225.63.41:8000';

  // 초기 로딩: 완료된 검사 목록 가져오기
  useEffect(() => {
    loadCompletedStudies();
  }, []);

  // 완료된 검사 목록 로드
  const loadCompletedStudies = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('📋 완료된 검사 목록 로드 시작');
      
      const response = await fetch(`${API_BASE}worklists/completed/`, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status}`);
      }

      const data = await response.json();
      if (data.status === 'success') {
        setCompletedStudies(data.data || []);
        console.log('✅ 완료된 검사 목록 로드 완료:', data.data?.length || 0, '건');
      } else {
        setError(data.message || '완료된 검사 목록을 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('서버 연결에 실패했습니다: ' + err.message);
      console.error('❌ 완료된 검사 목록 로딩 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  // 환자 선택시 자동으로 첫 번째 스터디로 뷰어 열기
  const handlePatientSelect = async (patient) => {
    setLoading(true);
    setError(null);
    try {
      console.log('👤 환자 선택:', patient.patient_name);
      
      // 1. 환자의 모든 검사 이력 조회
      const response = await fetch(`${API_BASE}worklists/completed/patient/${patient.patient_id}/`, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`환자 검사 이력 조회 실패: ${response.status}`);
      }

      const data = await response.json();
      if (data.status === 'success' && data.data.length > 0) {
        setSelectedPatient(patient);
        setPatientStudies(data.data);
        
        // 2. 자동으로 첫 번째 스터디 선택하고 뷰어 열기
        const firstStudy = data.data[0];
        setSelectedStudy(firstStudy);
        setViewMode('viewer');
        
        console.log('✅ 환자 검사 이력 로드 및 뷰어 열기 완료:', firstStudy);
      } else {
        setError('해당 환자의 완료된 검사가 없습니다.');
      }
    } catch (err) {
      setError('환자 검사 이력 조회에 실패했습니다: ' + err.message);
      console.error('❌ 환자 검사 이력 로딩 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  // 다른 스터디 선택
  const handleStudyChange = (study) => {
    setSelectedStudy(study);
    console.log('🔄 스터디 변경:', study);
  };

  // 환자 목록으로 돌아가기
  const handleBackToList = () => {
    setViewMode('list');
    setSelectedPatient(null);
    setPatientStudies([]);
    setSelectedStudy(null);
  };

  // 레이아웃 변경
  const changeLayout = (layout) => {
    setViewerLayout(layout);
  };

  // 리포트 저장 핸들러
  const handleReportSave = (savedReport) => {
    console.log('💾 리포트 저장됨:', savedReport);
  };

  // 환자별로 그룹화 (중복 환자 제거)
  const getUniquePatients = () => {
    const patientMap = new Map();
    completedStudies.forEach(study => {
      const key = study.patient_id;
      if (!patientMap.has(key)) {
        patientMap.set(key, {
          patient_id: study.patient_id,
          patient_name: study.patient_name,
          birth_date: study.birth_date,
          sex: study.sex,
          latest_exam: study.request_datetime,
          exam_count: 1,
          modalities: [study.modality],
          studies: [study]
        });
      } else {
        const existing = patientMap.get(key);
        existing.exam_count += 1;
        existing.studies.push(study);
        if (!existing.modalities.includes(study.modality)) {
          existing.modalities.push(study.modality);
        }
        // 최근 검사일로 업데이트
        if (new Date(study.request_datetime) > new Date(existing.latest_exam)) {
          existing.latest_exam = study.request_datetime;
        }
      }
    });
    return Array.from(patientMap.values()).sort((a, b) => 
      new Date(b.latest_exam) - new Date(a.latest_exam)
    );
  };

  // 로딩 상태
  if (loading && viewMode === 'list') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">🔄</div>
          <div className="text-xl">로딩 중...</div>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error && viewMode === 'list') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-600 mb-4">❌ {error}</p>
          <button 
            onClick={loadCompletedStudies}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* 환자 목록 보기 */}
      {viewMode === 'list' && (
        <div className="flex-1 overflow-hidden">
          <PatientListView 
            patients={getUniquePatients()}
            onPatientSelect={handlePatientSelect}
            onRefresh={loadCompletedStudies}
            loading={loading}
          />
        </div>
      )}

      {/* 통합 뷰어 */}
      {viewMode === 'viewer' && selectedStudy && (
        <IntegratedViewer 
          study={selectedStudy}
          patient={selectedPatient}
          patientStudies={patientStudies}
          layout={viewerLayout}
          onBackToList={handleBackToList}
          onStudyChange={handleStudyChange}
          onLayoutChange={changeLayout}
          onReportSave={handleReportSave}
          loading={loading}
        />
      )}
    </div>
  );
};

// 환자 목록 컴포넌트
const PatientListView = ({ patients, onPatientSelect, onRefresh, loading }) => (
  <div className="h-full flex flex-col">
    {/* 헤더 */}
    <div className="bg-white border-b border-gray-200 p-6 flex-shrink-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            🖼️ Real DICOM Viewer
          </h1>
          <p className="text-gray-600 mt-1">
            완료된 검사 환자 목록 ({patients.length}명)
          </p>
        </div>
        <button 
          onClick={onRefresh}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
        >
          <span>🔄</span>
          <span>{loading ? '로딩...' : '새로고침'}</span>
        </button>
      </div>
    </div>
    
    {/* 환자 목록 */}
    <div className="flex-1 overflow-y-auto p-6">
      {patients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {patients.map((patient) => (
            <PatientCard 
              key={patient.patient_id}
              patient={patient}
              onSelect={onPatientSelect}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-500">
          <div className="text-6xl mb-4">📋</div>
          <div className="text-xl mb-2">완료된 검사가 있는 환자가 없습니다</div>
          <div>검사 완료 후 여기에 표시됩니다</div>
        </div>
      )}
    </div>
  </div>
);

// 환자 카드 컴포넌트
const PatientCard = ({ patient, onSelect }) => (
  <div 
    onClick={() => onSelect(patient)}
    className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-blue-50 hover:border-blue-300 hover:shadow-lg transition-all duration-200 transform hover:scale-105"
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1">
        <div className="font-bold text-lg text-gray-800">{patient.patient_name}</div>
        <div className="text-gray-600 text-sm">ID: {patient.patient_id}</div>
        <div className="text-gray-600 text-sm">
          {patient.birth_date} ({patient.sex === 'M' ? '남' : '여'})
        </div>
      </div>
      <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
        {patient.exam_count}건
      </div>
    </div>
    
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">검사 유형:</span>
        <span className="font-medium">{patient.modalities.join(', ')}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">최근 검사:</span>
        <span className="font-medium">{new Date(patient.latest_exam).toLocaleDateString()}</span>
      </div>
    </div>
    
    {/* 클릭 유도 */}
    <div className="mt-4 pt-3 border-t border-gray-100 text-center">
      <div className="inline-flex items-center space-x-1 text-blue-600 font-medium">
        <span>🖼️</span>
        <span>이미지 보기</span>
        <span>→</span>
      </div>
    </div>
  </div>
);

// 통합 뷰어 컴포넌트
const IntegratedViewer = ({ 
  study, 
  patient, 
  patientStudies,
  layout, 
  onBackToList, 
  onStudyChange, 
  onLayoutChange,
  onReportSave,
  loading
}) => {
  
  // 레이아웃에 따른 CSS 클래스
  const getLayoutClasses = () => {
    switch (layout) {
      case 'viewer':
        return { viewer: 'flex-1', report: 'hidden' };
      case 'report':
        return { viewer: 'hidden', report: 'flex-1' };
      case 'split':
      default:
        return { viewer: 'flex-1', report: 'w-96' };
    }
  };

  const layoutClasses = getLayoutClasses();

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={onBackToList}
              className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm flex items-center space-x-1"
            >
              <span>←</span>
              <span>환자 목록</span>
            </button>
            
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                👤 {patient?.patient_name} - {study?.modality} {study?.body_part}
              </h2>
              <p className="text-sm text-gray-600">
                Study: {study?.study_uid?.substring(0, 40)}...
              </p>
            </div>
          </div>

          {/* 레이아웃 컨트롤 */}
          <div className="flex items-center space-x-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button 
                onClick={() => onLayoutChange('viewer')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  layout === 'viewer' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                🖼️ 이미지만
              </button>
              <button 
                onClick={() => onLayoutChange('split')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  layout === 'split' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                📱 분할
              </button>
              <button 
                onClick={() => onLayoutChange('report')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  layout === 'report' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                📋 리포트만
              </button>
            </div>
          </div>
        </div>

        {/* 환자의 다른 검사 목록 */}
        {patientStudies.length > 1 && (
          <div className="mt-3 flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">다른 검사:</span>
            <div className="flex space-x-1 overflow-x-auto">
              {patientStudies.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onStudyChange(s)}
                  className={`px-3 py-1 rounded text-xs whitespace-nowrap transition-colors ${
                    s.id === study.id 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {s.modality} - {s.body_part} ({new Date(s.exam_datetime || s.request_datetime).toLocaleDateString()})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex flex-1 overflow-hidden">
        {/* Cornerstone 뷰어 */}
        <div className={`${layoutClasses.viewer} ${layoutClasses.viewer !== 'hidden' ? 'border-r border-gray-200' : ''}`}>
          <CornerstoneViewer 
            studyUid={study?.study_uid}
            className="h-full"
            onImageChange={(imageInfo) => {
              console.log('📸 이미지 변경:', imageInfo);
            }}
          />
        </div>

        {/* 리포트 패널 */}
        <div className={layoutClasses.report}>
          <ReportPanel 
            studyUid={study?.study_uid}
            patientInfo={{
              patient_id: patient?.patient_id,
              patient_name: patient?.patient_name,
              exam_date: study?.exam_datetime?.split(' ')[0] || study?.request_datetime?.split(' ')[0],
              modality: study?.modality,
              body_part: study?.body_part
            }}
            onReportSave={onReportSave}
            className="h-full"
          />
        </div>
      </div>

      {/* 로딩 오버레이 */}
      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 text-center">
            <div className="text-2xl mb-2">🔄</div>
            <div>데이터 로딩 중...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealDicomViewer;