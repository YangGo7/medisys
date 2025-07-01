// RealDicomViewer.jsx - 원본 기능 유지 + CSS 적용 문제 해결


import React, { useState, useEffect } from 'react';

const RealDicomViewer = () => {
  const [completedStudies, setCompletedStudies] = useState([]);
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [orthancStudies, setOrthancStudies] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 뷰어 상태
  const [selectedStudyId, setSelectedStudyId] = useState(null);
  const [selectedStudyUid, setSelectedStudyUid] = useState(null);
  const [viewerLayout, setViewerLayout] = useState('split');

  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

  // 🔥 어노테이션이 포함된 DICOM 뷰어 컴포넌트
  const SimpleDicomImageViewer = ({ studyId, studyUid, patientInfo }) => {
    const [images, setImages] = useState([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [viewerLoading, setViewerLoading] = useState(false);
    const [viewerError, setViewerError] = useState('');
    const [annotations, setAnnotations] = useState({}); // instance_uid를 키로 하는 어노테이션 객체
    const [showAnnotations, setShowAnnotations] = useState(true);
    
    useEffect(() => {
      if (studyUid) {
        loadDicomStudy(studyUid);
      }
    }, [studyUid]);

    // 🔥 어노테이션 데이터 로드
    const loadAnnotations = async (instanceIds) => {
      try {
        console.log('🏷️ 어노테이션 로드 중...', instanceIds);
        
        const response = await fetch(`${API_BASE}annotations/by-instances/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            instance_uids: instanceIds
          })
        });

        if (response.ok) {
          const annotationData = await response.json();
          console.log('✅ 어노테이션 로드 완료:', annotationData);
          
          // instance_uid를 키로 하는 객체로 변환
          const annotationsByInstance = {};
          annotationData.forEach(annotation => {
            const instanceUid = annotation.instance_uid;
            if (!annotationsByInstance[instanceUid]) {
              annotationsByInstance[instanceUid] = [];
            }
            annotationsByInstance[instanceUid].push(annotation);
          });
          
          setAnnotations(annotationsByInstance);
        } else {
          console.warn('어노테이션 로드 실패:', response.status);
        }
      } catch (err) {
        console.error('어노테이션 로드 에러:', err);
      }
    };

    const loadDicomStudy = async (studyUID) => {
      try {
        setViewerLoading(true);
        setViewerError('');

        // Django 백엔드를 통해 Orthanc 검색
        const response = await fetch(`${API_BASE}ohif/orthanc/tools/find`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            Level: 'Study',
            Query: { StudyInstanceUID: studyUID }
          })
        });

        if (!response.ok) {
          throw new Error(`Study 검색 실패: ${response.status}`);
        }

        const studyIds = await response.json();
        if (studyIds.length === 0) {
          throw new Error('Study를 찾을 수 없습니다');
        }

        // Study 정보 조회
        const studyInfoResponse = await fetch(`${API_BASE}ohif/orthanc/studies/${studyIds[0]}`);

        if (!studyInfoResponse.ok) {
          throw new Error('Study 정보 조회 실패');
        }

        const studyInfo = await studyInfoResponse.json();
        const allImages = [];
        const allInstanceUids = [];

        // 모든 Series의 Instance 가져오기
        for (const seriesId of studyInfo.Series || []) {
          try {
            const seriesResponse = await fetch(`${API_BASE}ohif/orthanc/series/${seriesId}`);

            if (seriesResponse.ok) {
              const seriesInfo = await seriesResponse.json();
              for (const instanceId of seriesInfo.Instances || []) {
                // Instance 상세 정보 가져오기 (UID 확인용)
                const instanceResponse = await fetch(`${API_BASE}ohif/orthanc/instances/${instanceId}`);
                if (instanceResponse.ok) {
                  const instanceInfo = await instanceResponse.json();
                  const instanceUid = instanceInfo.MainDicomTags?.SOPInstanceUID;
                  
                  allImages.push({
                    instanceId: instanceId,
                    instanceUid: instanceUid,
                    imageUrl: `${API_BASE}ohif/orthanc/instances/${instanceId}/preview`
                  });
                  
                  if (instanceUid) {
                    allInstanceUids.push(instanceUid);
                  }
                }
              }
            }
          } catch (err) {
            console.warn(`Series ${seriesId} 로드 실패:`, err);
          }
        }

        if (allImages.length === 0) {
          throw new Error('이미지가 없습니다');
        }

        setImages(allImages);
        setCurrentImageIndex(0);
        
        // 🔥 어노테이션 로드
        if (allInstanceUids.length > 0) {
          await loadAnnotations(allInstanceUids);
        }

      } catch (err) {
        console.error('DICOM Study 로드 실패:', err);
        setViewerError(err.message);
      } finally {
        setViewerLoading(false);
      }
    };
  // Part 2/4: Navigation Functions to AnnotationOverlay

    const nextImage = () => {
      if (currentImageIndex < images.length - 1) {
        setCurrentImageIndex(currentImageIndex + 1);
      }
    };

    const previousImage = () => {
      if (currentImageIndex > 0) {
        setCurrentImageIndex(currentImageIndex - 1);
      }
    };

    // 🔥 어노테이션 렌더링 컴포넌트
    const AnnotationOverlay = ({ imageElement, annotations }) => {
      if (!showAnnotations || !annotations || annotations.length === 0) {
        return null;
      }

      return (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 15
        }}>
          {annotations.map((annotation, index) => {
            try {
              // bbox 파싱 (JSON 문자열 또는 객체)
              const bbox = typeof annotation.bbox === 'string' 
                ? JSON.parse(annotation.bbox) 
                : annotation.bbox;
              
              if (!bbox || !bbox.x || !bbox.y || !bbox.width || !bbox.height) {
                return null;
              }

              // 이미지 실제 크기 대비 bbox 위치 계산
              const imageRect = imageElement?.getBoundingClientRect();
              if (!imageRect) return null;

              const scaleX = imageRect.width / (bbox.imageWidth || imageRect.width);
              const scaleY = imageRect.height / (bbox.imageHeight || imageRect.height);

              const scaledX = bbox.x * scaleX;
              const scaledY = bbox.y * scaleY;
              const scaledWidth = bbox.width * scaleX;
              const scaledHeight = bbox.height * scaleY;

              return (
                <div key={`annotation-${annotation.id}-${index}`}>
                  {/* 어노테이션 박스 */}
                  <div
                    style={{
                      position: 'absolute',
                      left: scaledX,
                      top: scaledY,
                      width: scaledWidth,
                      height: scaledHeight,
                      border: '2px solid #ff6b6b',
                      backgroundColor: 'rgba(255, 107, 107, 0.1)',
                      borderRadius: '4px',
                      pointerEvents: 'auto',
                      cursor: 'pointer'
                    }}
                    title={`${annotation.label} - ${annotation.doctor_name}`}
                  />
                  
                  {/* 라벨과 판독의 정보 */}
                  <div
                    style={{
                      position: 'absolute',
                      left: scaledX,
                      top: scaledY > 100 ? scaledY - 25 : scaledY + scaledHeight + 5,  // 🔥 헤더 영역 피하기
                      backgroundColor: '#ff6b6b',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'auto',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}
                  >
                    {annotation.label}
                  </div>
                  
                  {/* 판독의 이름 */}
                  <div
                    style={{
                      position: 'absolute',
                      left: scaledX + scaledWidth - 80,
                      top: scaledY + scaledHeight + 5,
                      backgroundColor: '#4a5568',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontSize: '10px',
                      pointerEvents: 'auto'
                    }}
                  >
                    👨‍⚕️ {annotation.doctor_name}
                  </div>
                  
                  {/* 어노테이션 텍스트 (있는 경우) */}
                  {annotation.dr_text && (
                    <div
                      style={{
                        position: 'absolute',
                        left: scaledX,
                        top: scaledY + scaledHeight + 25,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        maxWidth: '200px',
                        pointerEvents: 'auto',
                        wordWrap: 'break-word'
                      }}
                    >
                      {annotation.dr_text}
                    </div>
                  )}
                </div>
              );
            } catch (err) {
              console.warn('어노테이션 렌더링 오류:', err, annotation);
              return null;
            }
          })}
        </div>
      );
    };
    // Part 3/4: SimpleDicomImageViewer Rendering to loadStudyInViewer

    if (viewerLoading) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          backgroundColor: '#000',
          color: '#fff'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '16px', fontSize: '32px' }}>⏳</div>
            <div>DICOM 로딩 중...</div>
          </div>
        </div>
      );
    }

    if (viewerError) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          backgroundColor: '#000',
          color: '#ff6b6b'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '16px', fontSize: '32px' }}>❌</div>
            <div>{viewerError}</div>
          </div>
        </div>
      );
    }

    if (images.length === 0) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          backgroundColor: '#000',
          color: '#888'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '16px', fontSize: '32px' }}>📷</div>
            <div>이미지가 없습니다</div>
          </div>
        </div>
      );
    }

    const currentImage = images[currentImageIndex];
    const currentAnnotations = currentImage?.instanceUid ? annotations[currentImage.instanceUid] || [] : [];

    return (
      <div style={{ height: '100%', backgroundColor: '#000', display: 'flex', flexDirection: 'column' }}>
        {/* 네비게이션 헤더 */}
        <div style={{
          backgroundColor: '#2a2a2a',
          color: '#fff',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #444'
        }}>
          <div style={{ fontSize: '14px' }}>
            <div style={{ fontWeight: 'bold' }}>{patientInfo?.name || 'Unknown'}</div>
            <div style={{ color: '#aaa', fontSize: '12px' }}>
              Study: {studyUid?.substring(0, 20)}... | 어노테이션: {currentAnnotations.length}개
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* 어노테이션 토글 버튼 */}
            <button
              onClick={() => setShowAnnotations(!showAnnotations)}
              style={{
                padding: '6px 12px',
                backgroundColor: showAnnotations ? '#ff6b6b' : '#666',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🏷️ 어노테이션 {showAnnotations ? 'ON' : 'OFF'}
            </button>
            
            <button
              onClick={previousImage}
              disabled={currentImageIndex === 0}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: currentImageIndex === 0 ? 'not-allowed' : 'pointer',
                opacity: currentImageIndex === 0 ? 0.5 : 1
              }}
            >
              ◀ 이전
            </button>
            <span style={{
              fontSize: '14px',
              padding: '8px 12px',
              backgroundColor: '#444',
              borderRadius: '4px',
              minWidth: '80px',
              textAlign: 'center'
            }}>
              {currentImageIndex + 1} / {images.length}
            </span>
            <button
              onClick={nextImage}
              disabled={currentImageIndex === images.length - 1}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: currentImageIndex === images.length - 1 ? 'not-allowed' : 'pointer',
                opacity: currentImageIndex === images.length - 1 ? 0.5 : 1
              }}
            >
              다음 ▶
            </button>
          </div>
        </div>

        {/* 이미지 영역 */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          backgroundColor: '#000',
          position: 'relative'
        }}>
          <div style={{
            maxWidth: '100%',
            maxHeight: '100%',
            border: '2px solid #444',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            position: 'relative'
          }}>
            <img
              ref={(el) => {
                if (el) {
                  el.setAttribute('data-image-element', 'true');
                }
              }}
              src={currentImage?.imageUrl}
              alt={`DICOM Image ${currentImageIndex + 1}`}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                display: 'block',
                backgroundColor: '#000'
              }}
              onLoad={(e) => {
                setShowAnnotations(prev => prev);
              }}
            />
            
            {/* 어노테이션 오버레이 */}
            <AnnotationOverlay 
              imageElement={document.querySelector('img[data-image-element="true"]')}
              annotations={currentAnnotations}
            />
          </div>
        </div>

        {/* 어노테이션 정보 패널 */}
        {currentAnnotations.length > 0 && (
          <div style={{
            backgroundColor: '#1a1a1a',
            color: '#fff',
            padding: '12px 16px',
            borderTop: '1px solid #444',
            maxHeight: '150px',
            overflowY: 'auto'
          }}>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
              🏷️ 어노테이션 정보 ({currentAnnotations.length}개)
            </div>
            {currentAnnotations.map((annotation, index) => (
              <div key={annotation.id} style={{
                backgroundColor: '#333',
                padding: '8px',
                marginBottom: '4px',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
                    #{index + 1} {annotation.label}
                  </span>
                  <span style={{ color: '#aaa' }}>
                    👨‍⚕️ {annotation.doctor_name}
                  </span>
                </div>
                {annotation.dr_text && (
                  <div style={{ marginTop: '4px', color: '#ccc' }}>
                    📝 {annotation.dr_text}
                  </div>
                )}
                <div style={{ marginTop: '4px', color: '#888', fontSize: '10px' }}>
                  📅 {new Date(annotation.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 레이아웃 클래스 함수
  const getLayoutClasses = (layout) => {
    switch(layout) {
      case 'viewer':
        return { viewer: { width: '100%' }, report: { display: 'none' } };
      case 'report':
        return { viewer: { display: 'none' }, report: { width: '100%' } };
      case 'split':
      default:
        return { viewer: { width: '60%' }, report: { width: '40%' } };
    }
  };

  const layoutClasses = getLayoutClasses(viewerLayout);

  useEffect(() => {
    loadCompletedStudies();
  }, []);

  // 완료된 검사 목록 로드
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
      } else {
        setError(data.message || '데이터 로드 실패');
      }
    } catch (err) {
      setError('서버 연결 실패: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 환자 카드 클릭 핸들러
  const handleStudyCardClick = async (study) => {
    if (selectedStudy?.id === study.id) return;
    
    setSelectedStudy(study);
    setOrthancStudies([]);
    setSelectedStudyId(null);
    setSelectedStudyUid(null);
    setReportData(null);
    
    const patientId = study.patient_id;
    if (!patientId) {
      console.warn('Patient ID가 없습니다:', study);
      return;
    }

    try {
      console.log(`🔍 Patient ID ${patientId}로 Orthanc Study 검색 중...`);
      
      const response = await fetch(`${API_BASE}integration/orthanc/studies/search-by-patient/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_id: patientId })
      });

      if (!response.ok) {
        console.warn(`Patient ID ${patientId}에 대한 API 호출 실패: ${response.status}`);
        return;
      }

      const data = await response.json();
      
      if (data.success && data.studies && data.studies.length > 0) {
        setOrthancStudies(data.studies);
        console.log(`✅ ${data.studies.length}개 Orthanc Study 발견`);
        
        const firstStudy = data.studies[0];
        await loadStudyInViewer(firstStudy);
        await loadReportData(firstStudy.study_uid);
      } else {
        console.log(`Patient ID ${patientId}: DICOM 데이터 없음`);
        setOrthancStudies([]);
      }
    } catch (err) {
      console.error('Orthanc Study 검색 중 오류:', err);
    }
  };

  // Study 뷰어 로드
  const loadStudyInViewer = async (orthancStudy) => {
    try {
      console.log('🖼️ Study 뷰어에 로드:', orthancStudy.study_uid);
      
      const studyUid = orthancStudy.study_uid;
      const studyId = orthancStudy.study_id;
      
      if (!studyUid || !studyId) {
        console.warn('Study UID 또는 Study ID가 없습니다:', orthancStudy);
        return;
      }

      setSelectedStudyId(studyId);
      setSelectedStudyUid(studyUid);
      
      console.log(`✅ Study 로드 완료: studyId=${studyId}, studyUid=${studyUid}`);
      
    } catch (err) {
      console.error('Study 뷰어 로드 실패:', err);
    }
  };
  // Part 4/4: loadReportData to Component End

  // 판독문 데이터 로드
  const loadReportData = async (studyUid) => {
    try {
      console.log('📋 판독문 로드:', studyUid);
      
      const response = await fetch(`${API_BASE}reports/${studyUid}/`, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.report) {
          setReportData(data.report);
          console.log('✅ 판독문 로드 완료');
        } else {
          setReportData(null);
          console.log('ℹ️ 작성된 판독문이 없습니다');
        }
      } else if (response.status === 404) {
        setReportData(null);
        console.log('ℹ️ 판독문이 존재하지 않습니다');
      }
    } catch (err) {
      console.error('❌ 판독문 로드 실패:', err);
      setReportData(null);
    }
  };

  // 환자 카드 컴포넌트
  // 환자 카드 컴포넌트 (inline style로 강제 적용)
  const PatientCard = ({ study, isSelected, onClick }) => {
    const baseCardStyle = {
      padding: '24px',
      borderRadius: '16px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      border: '2px solid',
      marginBottom: '16px',
      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
      boxShadow: isSelected ? '0 8px 32px rgba(59, 130, 246, 0.3)' : '0 4px 16px rgba(0, 0, 0, 0.1)',
      backgroundColor: isSelected ? '#3b82f6' : '#ffffff',
      borderColor: isSelected ? '#2563eb' : '#e5e7eb',
      color: isSelected ? '#ffffff' : '#111827'
    };

    const statusBadgeStyle = {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 'bold',
      backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#dcfce7',
      color: isSelected ? '#ffffff' : '#166534'
    };

    const studyCountStyle = {
      fontSize: '12px',
      backgroundColor: '#fef3c7',
      color: '#d97706',
      padding: '4px 8px',
      borderRadius: '12px',
      fontWeight: '500'
    };

    return (
      <div style={baseCardStyle} onClick={() => onClick(study)}>
        {/* 상태 인디케이터 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={statusBadgeStyle}>
            {isSelected ? (
              <>
                <span style={{ 
                  width: '8px', 
                  height: '8px', 
                  backgroundColor: '#ffffff', 
                  borderRadius: '50%', 
                  marginRight: '8px',
                  animation: 'pulse 2s infinite'
                }}></span>
                선택됨
              </>
            ) : (
              <>
                <span style={{ 
                  width: '8px', 
                  height: '8px', 
                  backgroundColor: '#10b981', 
                  borderRadius: '50%', 
                  marginRight: '8px'
                }}></span>
                검사완료
              </>
            )}
          </div>
          
          {orthancStudies.length > 0 && selectedStudy?.id === study.id && (
            <div style={studyCountStyle}>
              <span style={{ 
                width: '6px', 
                height: '6px', 
                backgroundColor: '#f59e0b', 
                borderRadius: '50%', 
                marginRight: '6px',
                display: 'inline-block'
              }}></span>
              {orthancStudies.length}개 Study
            </div>
          )}
        </div>

        {/* 환자 정보 */}
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: 'bold', 
            margin: '0 0 8px 0',
            color: isSelected ? '#ffffff' : '#111827'
          }}>
            {study.patient_name || '환자명 미상'}
          </h3>
          <p style={{ 
            fontSize: '14px', 
            fontWeight: '500', 
            margin: '0',
            color: isSelected ? 'rgba(255,255,255,0.8)' : '#6b7280'
          }}>
            ID: {study.patient_id}
          </p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '16px', 
          fontSize: '14px',
          marginBottom: '16px'
        }}>
          <div>
            <div style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : '#6b7280', marginBottom: '4px' }}>성별</div>
            <div style={{ fontWeight: '500', color: isSelected ? '#ffffff' : '#111827' }}>
              {study.sex || '-'}
            </div>
          </div>
          <div>
            <div style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : '#6b7280', marginBottom: '4px' }}>모달리티</div>
            <div style={{ fontWeight: '500', color: isSelected ? '#ffffff' : '#111827' }}>
              {study.modality || '-'}
            </div>
          </div>
        </div>

        <div style={{ fontSize: '14px', marginBottom: '16px' }}>
          <div style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : '#6b7280', marginBottom: '4px' }}>검사일</div>
          <div style={{ fontWeight: '500', color: isSelected ? '#ffffff' : '#111827' }}>
            {study.request_datetime ? new Date(study.request_datetime).toLocaleDateString() : '-'}
          </div>
        </div>

        {/* 하단 힌트 */}
        <div style={{ 
          paddingTop: '16px', 
          borderTop: `1px solid ${isSelected ? 'rgba(255,255,255,0.2)' : '#e5e7eb'}`,
          textAlign: 'center'
        }}>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: '500',
            color: isSelected ? 'rgba(255,255,255,0.9)' : '#6b7280'
          }}>
            {isSelected ? '✨ 현재 선택된 환자' : '👆 클릭하여 DICOM 이미지 보기'}
          </div>
        </div>
      </div>
    );
  };

  // 판독문 패널 컴포넌트 (inline style로 강제 적용)
  const ReportPanel = () => (
    <div style={{ height: '100%', backgroundColor: '#f9fafb', overflow: 'hidden' }}>
      {/* 헤더 */}
      <div style={{ 
        padding: '24px', 
        borderBottom: '1px solid #e5e7eb', 
        backgroundColor: '#ffffff' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            backgroundColor: '#3b82f6', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <span style={{ fontSize: '20px' }}>📋</span>
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', margin: '0 0 4px 0' }}>판독 리포트</h3>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0' }}>
              {reportData ? '작성 완료' : '작성된 판독문이 없습니다'}
            </p>
          </div>
        </div>
      </div>

      {/* 환자 정보 */}
      {selectedStudy && (
        <div style={{ 
          padding: '24px', 
          backgroundColor: '#dbeafe', 
          borderBottom: '1px solid #e5e7eb' 
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '16px', 
            fontSize: '14px' 
          }}>
            <div>
              <span style={{ color: '#374151', fontWeight: '500' }}>환자명</span>
              <div style={{ fontWeight: 'bold', color: '#111827' }}>{selectedStudy.patient_name}</div>
            </div>
            <div>
              <span style={{ color: '#374151', fontWeight: '500' }}>환자 ID</span>
              <div style={{ fontWeight: 'bold', color: '#111827' }}>{selectedStudy.patient_id}</div>
            </div>
            <div>
              <span style={{ color: '#374151', fontWeight: '500' }}>검사일</span>
              <div style={{ fontWeight: 'bold', color: '#111827' }}>
                {selectedStudy.request_datetime ? new Date(selectedStudy.request_datetime).toLocaleDateString() : 'N/A'}
              </div>
            </div>
            <div>
              <span style={{ color: '#374151', fontWeight: '500' }}>모달리티</span>
              <div style={{ fontWeight: 'bold', color: '#111827' }}>{selectedStudy.modality || 'N/A'}</div>
            </div>
          </div>
        </div>
      )}

      {/* 판독문 내용 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {reportData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* 상태 배지 */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: reportData.report_status === 'completed' ? '#dcfce7' : 
                             reportData.report_status === 'draft' ? '#fef3c7' : '#dbeafe',
              color: reportData.report_status === 'completed' ? '#166534' :
                     reportData.report_status === 'draft' ? '#d97706' : '#1d4ed8',
              border: '1px solid',
              borderColor: reportData.report_status === 'completed' ? '#bbf7d0' :
                          reportData.report_status === 'draft' ? '#fed7aa' : '#bfdbfe',
              alignSelf: 'flex-start'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                marginRight: '8px',
                backgroundColor: reportData.report_status === 'completed' ? '#10b981' :
                               reportData.report_status === 'draft' ? '#f59e0b' : '#3b82f6'
              }}></span>
              {reportData.report_status === 'completed' ? '완료' : 
               reportData.report_status === 'draft' ? '초안' : '승인'}
            </div>

            {/* 판독문 내용 */}
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ 
                whiteSpace: 'pre-wrap', 
                color: '#111827', 
                lineHeight: '1.6',
                fontSize: '14px'
              }}>
                {reportData.dr_report}
              </div>
            </div>

            {/* 작성자 정보 */}
            <div style={{
              backgroundColor: '#f3f4f6',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '16px', 
                fontSize: '14px' 
              }}>
                <div>
                  <span style={{ color: '#6b7280', fontWeight: '500' }}>👨‍⚕️ 판독의</span>
                  <div style={{ fontWeight: 'bold', color: '#111827' }}>{reportData.doctor_name || '김영상'}</div>
                </div>
                <div>
                  <span style={{ color: '#6b7280', fontWeight: '500' }}>📅 작성일</span>
                  <div style={{ fontWeight: 'bold', color: '#111827' }}>
                    {reportData.created_at ? new Date(reportData.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%' 
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                backgroundColor: '#e5e7eb', 
                borderRadius: '16px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 16px auto' 
              }}>
                <span style={{ fontSize: '32px', opacity: 0.5 }}>📝</span>
              </div>
              <h4 style={{ fontSize: '18px', fontWeight: '500', color: '#6b7280', margin: '0 0 8px 0' }}>판독문이 없습니다</h4>
              <p style={{ color: '#9ca3af', margin: '0' }}>이 검사에 대한 판독문이 아직 작성되지 않았습니다.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '80px',
            height: '80px',
            border: '4px solid #3b82f6',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 24px auto'
          }}></div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>시스템 로딩 중</div>
          <div style={{ color: '#3b82f6' }}>의료영상 정보를 불러오고 있습니다...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            backgroundColor: '#fee2e2',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto'
          }}>
            <span style={{ fontSize: '40px' }}>⚠️</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>시스템 오류</div>
          <div style={{
            color: '#dc2626',
            marginBottom: '24px',
            backgroundColor: '#fef2f2',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #fecaca'
          }}>
            {error}
          </div>
          <button 
            onClick={loadCompletedStudies}
            style={{
              padding: '12px 32px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#b91c1c'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#dc2626'}
          >
            🔄 다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', backgroundColor: '#f3f4f6' }}>
      {/* 왼쪽: 환자 목록 */}
      <div style={{
        width: '384px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #d1d5db',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '2px 0 4px rgba(0, 0, 0, 0.1)'
      }}>
        {/* 헤더 */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e5e7eb',
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '24px' }}>🩻</span>
            </div>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 4px 0' }}>DICOM Viewer</h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', margin: '0' }}>
                검사완료 환자 목록 ({completedStudies.length}건)
              </p>
            </div>
          </div>
        </div>
        
        {/* 환자 카드 목록 */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px'
        }}>
          {completedStudies.map((study) => (
            <PatientCard 
              key={study.id}
              study={study}
              isSelected={selectedStudy?.id === study.id}
              onClick={handleStudyCardClick}
            />
          ))}
          
          {completedStudies.length === 0 && (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{
                width: '80px',
                height: '80px',
                backgroundColor: '#f3f4f6',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px auto'
              }}>
                <span style={{ fontSize: '40px' }}>📭</span>
              </div>
              <div style={{ fontSize: '20px', fontWeight: '500', marginBottom: '8px', color: '#111827' }}>
                검사 완료된 환자가 없습니다
              </div>
              <div style={{ color: '#6b7280' }}>새로운 검사 완료를 기다리고 있습니다</div>
            </div>
          )}
        </div>
      </div>

      {/* 중간: DICOM 뷰어 */}
      <div style={{
        ...layoutClasses.viewer,
        backgroundColor: '#000000',
        position: 'relative',
        transition: 'all 0.3s ease'
      }}>
        {selectedStudyId ? (
          <div style={{ height: '100%', position: 'relative' }}>
            {/* 환자 정보 헤더 */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 5,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), rgba(0,0,0,0.4))',
              padding: '24px',
              color: '#ffffff'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
                {selectedStudy?.patient_name || 'Unknown'}
              </div>
              <div style={{ fontSize: '14px', color: '#d1d5db', marginBottom: '8px' }}>
                Patient ID: {selectedStudy?.patient_id}
                {orthancStudies.length > 0 && ` • ${orthancStudies[0]?.modality} • ${orthancStudies.length}개 Study`}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#9ca3af',
                fontFamily: 'monospace',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                padding: '4px 12px',
                borderRadius: '8px',
                display: 'inline-block'
              }}>
                Study ID: {selectedStudyId} • Study UID: {selectedStudyUid}
              </div>
            </div>
            
            {/* SimpleDicomImageViewer */}
            <SimpleDicomImageViewer
              studyId={selectedStudyId}
              studyUid={selectedStudyUid}
              patientInfo={{
                name: selectedStudy?.patient_name,
                id: selectedStudy?.patient_id,
                birthDate: selectedStudy?.birth_date,
                sex: selectedStudy?.sex
              }}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ textAlign: 'center', color: '#ffffff' }}>
              <div style={{
                width: '160px',
                height: '160px',
                background: 'rgba(75, 85, 99, 0.3)',
                borderRadius: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 32px auto'
              }}>
                <span style={{ fontSize: '96px' }}>🖼️</span>
              </div>
              <div style={{
                fontSize: '48px',
                fontWeight: 'bold',
                marginBottom: '16px',
                color: '#3b82f6'
              }}>
                DICOM Viewer
              </div>
              <div style={{
                color: '#d1d5db',
                fontSize: '20px',
                marginBottom: '32px'
              }}>
                {selectedStudy ? 
                  `${selectedStudy.patient_name}의 DICOM 이미지를 로딩 중...` : 
                  '왼쪽에서 환자 카드를 클릭하여 DICOM 이미지를 확인하세요'
                }
              </div>
              
              {/* 기능 안내 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '24px',
                maxWidth: '800px',
                margin: '0 auto'
              }}>
                <div style={{
                  background: 'rgba(75, 85, 99, 0.5)',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(75, 85, 99, 0.3)'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>👆</div>
                  <div style={{ fontWeight: '500', color: '#e5e7eb' }}>환자 선택</div>
                  <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '4px' }}>카드를 클릭하여 시작</div>
                </div>
                <div style={{
                  background: 'rgba(75, 85, 99, 0.5)',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(75, 85, 99, 0.3)'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>🖼️</div>
                  <div style={{ fontWeight: '500', color: '#e5e7eb' }}>이미지 뷰어</div>
                  <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '4px' }}>DICOM 영상 확인</div>
                </div>
                <div style={{
                  background: 'rgba(75, 85, 99, 0.5)',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(75, 85, 99, 0.3)'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>📋</div>
                  <div style={{ fontWeight: '500', color: '#e5e7eb' }}>판독 리포트</div>
                  <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '4px' }}>판독문 내용 확인</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 오른쪽: 판독문 패널 */}
      <div style={{
        ...layoutClasses.report,
        transition: 'all 0.3s ease'
      }}>
        <ReportPanel />
      </div>

      {/* 하단: 레이아웃 제어 버튼 */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '8px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '12px',
        border: '1px solid #d1d5db',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
      }}>
        <button
          onClick={() => setViewerLayout('viewer')}
          style={{
            padding: '8px 16px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: viewerLayout === 'viewer' ? '#3b82f6' : 'transparent',
            color: viewerLayout === 'viewer' ? '#ffffff' : '#6b7280'
          }}
          onMouseOver={(e) => {
            if (viewerLayout !== 'viewer') {
              e.target.style.backgroundColor = '#f3f4f6';
              e.target.style.color = '#3b82f6';
            }
          }}
          onMouseOut={(e) => {
            if (viewerLayout !== 'viewer') {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#6b7280';
            }
          }}
        >
          뷰어만
        </button>
        <button
          onClick={() => setViewerLayout('split')}
          style={{
            padding: '8px 16px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: viewerLayout === 'split' ? '#3b82f6' : 'transparent',
            color: viewerLayout === 'split' ? '#ffffff' : '#6b7280'
          }}
          onMouseOver={(e) => {
            if (viewerLayout !== 'split') {
              e.target.style.backgroundColor = '#f3f4f6';
              e.target.style.color = '#3b82f6';
            }
          }}
          onMouseOut={(e) => {
            if (viewerLayout !== 'split') {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#6b7280';
            }
          }}
        >
          분할
        </button>
        <button
          onClick={() => setViewerLayout('report')}
          style={{
            padding: '8px 16px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: viewerLayout === 'report' ? '#3b82f6' : 'transparent',
            color: viewerLayout === 'report' ? '#ffffff' : '#6b7280'
          }}
          onMouseOver={(e) => {
            if (viewerLayout !== 'report') {
              e.target.style.backgroundColor = '#f3f4f6';
              e.target.style.color = '#3b82f6';
            }
          }}
          onMouseOut={(e) => {
            if (viewerLayout !== 'report') {
              e.target.style.backgroundColor = 'transparent';
              e.target.style.color = '#6b7280';
            }
          }}
        >
          리포트만
        </button>
      </div>

      {/* CSS 애니메이션 키프레임 */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default RealDicomViewer;