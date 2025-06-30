// frontend/src/components/RIS/RealDicomViewer.jsx - 처음부터 뷰어 표시

import React, { useState, useEffect } from 'react';
import SimpleDicomImageViewer from './SimpleDicomImageViewer';
import ReportPanel from './ReportPanel';

const RealDicomViewer = () => {
  const [completedStudies, setCompletedStudies] = useState([]);
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [orthancStudies, setOrthancStudies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 🔥 처음부터 분할 뷰어 모드로 시작
  const [viewerLayout, setViewerLayout] = useState('split');

  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://35.225.63.41:8000';

  useEffect(() => {
    loadCompletedStudies();
  }, []);

  // 레이아웃 클래스 정의
  const getLayoutClasses = (layout) => {
    switch(layout) {
      case 'viewer':
        return {
          viewer: 'w-full',
          report: 'hidden'
        };
      case 'report':
        return {
          viewer: 'hidden', 
          report: 'w-full'
        };
      case 'split':
      default:
        return {
          viewer: 'w-2/3',
          report: 'w-1/3'
        };
    }
  };

  const layoutClasses = getLayoutClasses(viewerLayout);
  const ORTHANC_URL = process.env.REACT_APP_ORTHANC_URL || 'http://35.225.63.41:8042';

  useEffect(() => {
    loadCompletedStudies();
  }, []);

  const loadCompletedStudies = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}worklists/completed/`, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error(`API 호출 실패: ${response.status}`);

      const data = await response.json();
      if (data.status === 'success') {
        setCompletedStudies(data.data || []);
        console.log('✅ 완료된 검사 목록:', data.data?.length || 0, '건');
        if (data.data && data.data.length > 0) {
          await handleStudySelect(data.data[0]); // 첫 번째 검사 자동 선택
        }
      } else {
        setError(data.message || '데이터 로드 실패');
      }
    } catch (err) {
      setError('서버 연결 실패: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 환자 선택시 백엔드 API를 통해 Orthanc Study들 가져오기
  const handleStudySelect = async (study) => {
    setSelectedStudy(study);
    setOrthancStudies([]);
    
    const patientId = study.patient_id;
    if (!patientId) {
      console.warn('Patient ID가 없습니다:', study);
      return;
    }

    try {
      console.log(`🔍 백엔드 API로 Patient ID ${patientId} Orthanc Study 검색 중...`);
      
      // 백엔드 API를 통해 Orthanc에서 Patient ID로 검색
      const response = await fetch(`${API_BASE}integration/orthanc/studies/search-by-patient/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patient_id: patientId
        })
      });

      if (!response.ok) {
        console.warn(`Patient ID ${patientId}에 대한 백엔드 API 호출 실패: ${response.status}`);
        return;
      }

      const data = await response.json();
      
      if (!data.success || !data.studies || data.studies.length === 0) {
        console.warn(`Patient ID ${patientId}에 매칭되는 Orthanc Study 없음`);
        return;
      }

      setOrthancStudies(data.studies);
      console.log(`✅ Patient ${patientId}: ${data.studies.length}개 Orthanc Study 발견`);

    } catch (err) {
      console.error('❌ Orthanc Study 검색 실패:', err);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-300 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
            <div className="absolute inset-0 w-20 h-20 border-4 border-purple-300 border-b-white rounded-full animate-spin mx-auto animation-delay-150"></div>
          </div>
          <div className="text-2xl font-bold text-white mb-2">🖼️ DICOM Viewer</div>
          <div className="text-blue-200">데이터 로딩중...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-red-900 to-pink-900">
        <div className="bg-white/10 backdrop-blur-lg p-8 rounded-2xl shadow-2xl border border-white/20">
          <div className="text-center text-white">
            <div className="text-6xl mb-4">⚠️</div>
            <div className="text-xl font-bold mb-4">연결 오류</div>
            <p className="text-red-200 mb-6">{error}</p>
            <button 
              onClick={loadCompletedStudies}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all transform hover:scale-105"
            >
              🔄 다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* 왼쪽: 환자 목록 */}
      <div className="w-80 bg-white/10 backdrop-blur-lg border-r border-white/20 flex flex-col">
        <div className="p-6 border-b border-white/20 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl">🖼️</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">DICOM Viewer</h2>
              <p className="text-blue-200 text-sm">검사완료 ({completedStudies.length}건)</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {completedStudies.map((study) => (
            <StudyCard 
              key={study.id}
              study={study}
              isSelected={selectedStudy?.id === study.id}
              onSelect={handleStudySelect}
              orthancStudyCount={selectedStudy?.id === study.id ? orthancStudies.length : 0}
            />
          ))}
          
          {completedStudies.length === 0 && (
            <div className="p-8 text-center text-white/60">
              <div className="text-4xl mb-4">📭</div>
              <div className="font-medium">완료된 검사가 없습니다</div>
            </div>
          )}
        </div>
      </div>

      {/* 중간: DICOM 뷰어 */}
      <div className="flex-1 bg-black relative">
        {selectedStudy && orthancStudies.length > 0 ? (
          <div className="h-full relative">
            <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-r from-black/80 to-transparent p-4">
              <div className="text-white">
                <div className="text-lg font-bold">{selectedStudy.patient_name}</div>
                <div className="text-sm text-gray-300">
                  {orthancStudies[0]?.modality} • {orthancStudies.length}개 Study
                </div>
              </div>
            </div>
            
            <SimpleDicomImageViewer
              studyUid={orthancStudies[0]?.study_uid}
              patientInfo={{
                name: selectedStudy.patient_name,
                id: selectedStudy.patient_id,
                birthDate: selectedStudy.birth_date,
                sex: selectedStudy.sex
              }}
            />
          </div>
        ) : selectedStudy ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <span className="text-4xl">📋</span>
              </div>
              <div className="text-2xl font-bold mb-2">검사 완료</div>
              <div className="text-gray-400 mb-6">해당 환자의 DICOM 이미지가 없습니다</div>
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 max-w-md">
                <div className="space-y-2 text-left">
                  <div className="flex justify-between">
                    <span className="text-gray-300">환자:</span>
                    <span className="text-white">{selectedStudy.patient_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Patient ID:</span>
                    <span className="text-white">{selectedStudy.patient_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">검사:</span>
                    <span className="text-white">{selectedStudy.modality}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <div className="w-32 h-32 bg-gradient-to-r from-blue-500/10 to-purple-600/10 rounded-3xl flex items-center justify-center mb-8 mx-auto">
                <span className="text-6xl">🔍</span>
              </div>
              <div className="text-3xl font-bold mb-4">DICOM Viewer</div>
              <div className="text-gray-400 text-lg">왼쪽에서 검사를 선택하세요</div>
            </div>
          </div>
        )}
      </div>

      {/* 오른쪽: 리포트 패널 */}
      <div className="w-96 bg-white/10 backdrop-blur-lg border-l border-white/20">
        {selectedStudy ? (
          <ReportPanel 
            studyUid={orthancStudies[0]?.study_uid}
            patientInfo={{
              patient_id: selectedStudy.patient_id,
              patient_name: selectedStudy.patient_name,
              exam_date: selectedStudy.request_datetime?.split(' ')[0],
              modality: selectedStudy.modality,
              body_part: selectedStudy.body_part
            }}
            onReportSave={(report) => console.log('리포트 저장:', report)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white/60">
            <div className="text-center p-8">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500/20 to-pink-600/20 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                <span className="text-3xl">📝</span>
              </div>
              <div className="font-medium mb-2">리포트 패널</div>
              <div className="text-sm">검사를 선택하면 판독 정보가 표시됩니다</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 수정된 검사 카드 - Orthanc Study 개수 표시
const StudyCard = ({ study, isSelected, onSelect, orthancStudyCount }) => (
  <div 
    onClick={() => onSelect(study)}
    className={`p-4 rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-105 ${
      isSelected 
        ? 'bg-gradient-to-r from-blue-500/30 to-purple-600/30 border-2 border-blue-400/50 shadow-lg shadow-blue-500/25' 
        : 'bg-white/10 hover:bg-white/20 border border-white/20'
    }`}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1">
        <div className="font-bold text-white text-lg">{study.patient_name}</div>
        <div className="text-xs text-gray-300 font-mono">ID: {study.patient_id}</div>
      </div>
      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
        isSelected && orthancStudyCount > 0
          ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
          : isSelected 
          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
          : 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
      }`}>
        {isSelected ? (orthancStudyCount > 0 ? `📷 ${orthancStudyCount}개` : '📋 없음') : '📋 완료'}
      </div>
    </div>
    
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-gray-400 text-sm">검사</span>
        <span className="font-medium text-white bg-blue-500/20 px-2 py-1 rounded text-sm">
          {study.modality}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-400 text-sm">부위</span>
        <span className="text-white font-medium">{study.body_part}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-400 text-sm">날짜</span>
        <span className="text-gray-300 text-sm">
          {study.request_datetime ? new Date(study.request_datetime).toLocaleDateString() : '-'}
        </span>
      </div>
    </div>
    
    {isSelected && (
      <div className="mt-3 pt-3 border-t border-white/20">
        <div className="flex items-center justify-center text-blue-300 text-sm font-medium">
          <span className="mr-2">✨</span>
          선택됨
        </div>
      </div>
    )}
  </div>
);

export default RealDicomViewer;