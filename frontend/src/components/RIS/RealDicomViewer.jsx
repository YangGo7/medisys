import React, { useState, useEffect, useRef } from 'react';

const RealDicomViewer = () => {
  const [completedStudies, setCompletedStudies] = useState([]);
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [orthancStudies, setOrthancStudies] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [selectedStudyId, setSelectedStudyId] = useState(null);
  const [selectedStudyUid, setSelectedStudyUid] = useState(null);
  const [viewerLayout, setViewerLayout] = useState('split');

  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

  // 🔥 개쌤 DICOM 뷰어 - 그냥 간단하게!
  const SimpleDicomImageViewer = ({ studyId, studyUid, patientInfo }) => {
    const [images, setImages] = useState([]);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [viewerLoading, setViewerLoading] = useState(false);
    const [viewerError, setViewerError] = useState('');
    const [annotations, setAnnotations] = useState([]);
    const [showAnnotations, setShowAnnotations] = useState(true);
    
    const imageContainerRef = useRef(null);
    
    useEffect(() => {
      if (studyUid) {
        loadDicomStudy(studyUid);
      }
    }, [studyUid]);

    // 🔥 간단하게 어노테이션 로드!
    const loadAnnotationsForInstance = async (instanceUid) => {
      try {
        console.log('🏷️ 어노테이션 로드:', instanceUid);
        
        // 그냥 list API에 instance_uid 파라미터 추가해서 호출
        const response = await fetch(`${API_BASE}dr-annotations/list/?instance_uid=${instanceUid}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ 어노테이션 응답:', data);
          
          if (data.status === 'success' && data.annotations) {
            setAnnotations(data.annotations);
            console.log('✅ 어노테이션 설정 완료:', data.annotations);
          } else {
            setAnnotations([]);
          }
        } else {
          console.warn('어노테이션 로드 실패:', response.status);
          setAnnotations([]);
        }
      } catch (err) {
        console.error('어노테이션 로드 에러:', err);
        setAnnotations([]);
      }
    };

    const loadDicomStudy = async (studyUID) => {
      try {
        setViewerLoading(true);
        setViewerError('');

        // Django 백엔드를 통해 Orthanc 검색
        const response = await fetch(`${API_BASE}ohif/orthanc/tools/find`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Level: 'Study',
            Query: { StudyInstanceUID: studyUID }
          })
        });

        if (!response.ok) throw new Error(`Study 검색 실패: ${response.status}`);

        const studyIds = await response.json();
        if (studyIds.length === 0) throw new Error('Study를 찾을 수 없습니다');

        // Study 정보 조회
        const studyInfoResponse = await fetch(`${API_BASE}ohif/orthanc/studies/${studyIds[0]}`);
        if (!studyInfoResponse.ok) throw new Error('Study 정보 조회 실패');

        const studyInfo = await studyInfoResponse.json();
        const allImages = [];

        // 모든 Series의 Instance 가져오기
        for (const seriesId of studyInfo.Series || []) {
          try {
            const seriesResponse = await fetch(`${API_BASE}ohif/orthanc/series/${seriesId}`);
            if (seriesResponse.ok) {
              const seriesInfo = await seriesResponse.json();
              for (const instanceId of seriesInfo.Instances || []) {
                const instanceResponse = await fetch(`${API_BASE}ohif/orthanc/instances/${instanceId}`);
                if (instanceResponse.ok) {
                  const instanceInfo = await instanceResponse.json();
                  const instanceUid = instanceInfo.MainDicomTags?.SOPInstanceUID;
                  
                  allImages.push({
                    instanceId: instanceId,
                    instanceUid: instanceUid,
                    imageUrl: `${API_BASE}ohif/orthanc/instances/${instanceId}/preview`
                  });
                }
              }
            }
          } catch (err) {
            console.warn(`Series ${seriesId} 로드 실패:`, err);
          }
        }

        if (allImages.length === 0) throw new Error('이미지가 없습니다');

        setImages(allImages);
        setCurrentImageIndex(0);
        
        // 🔥 첫 번째 이미지의 어노테이션 로드
        if (allImages[0]?.instanceUid) {
          await loadAnnotationsForInstance(allImages[0].instanceUid);
        }

      } catch (err) {
        console.error('DICOM Study 로드 실패:', err);
        setViewerError(err.message);
      } finally {
        setViewerLoading(false);
      }
    };

    // 이미지 변경 시 어노테이션도 다시 로드
    const changeImage = async (newIndex) => {
      setCurrentImageIndex(newIndex);
      const newImage = images[newIndex];
      if (newImage?.instanceUid) {
        await loadAnnotationsForInstance(newImage.instanceUid);
      }
    };

    const nextImage = () => {
      if (currentImageIndex < images.length - 1) {
        changeImage(currentImageIndex + 1);
      }
    };

    const previousImage = () => {
      if (currentImageIndex > 0) {
        changeImage(currentImageIndex - 1);
      }
    };

    // 🔥 정확한 어노테이션 오버레이 - viewer_v2 방식과 동일하게!
    const renderAnnotations = () => {
      if (!showAnnotations || !annotations || annotations.length === 0) {
        return null;
      }

      const imageElement = imageContainerRef.current?.querySelector('img');
      if (!imageElement) return null;

      // 🔥 viewer_v2와 동일한 이미지 크기 계산 방식
      const container = imageElement.parentElement;
      const naturalWidth = imageElement.naturalWidth || 512;
      const naturalHeight = imageElement.naturalHeight || 512;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      // object-fit: contain 방식으로 실제 표시 크기 계산
      const containerAspect = containerWidth / containerHeight;
      const imageAspect = naturalWidth / naturalHeight;
      
      let displayWidth, displayHeight, offsetX, offsetY;
      
      if (imageAspect > containerAspect) {
        // 이미지가 더 넓음 - 가로에 맞춤
        displayWidth = containerWidth;
        displayHeight = containerWidth / imageAspect;
        offsetX = 0;
        offsetY = (containerHeight - displayHeight) / 2;
      } else {
        // 이미지가 더 높음 - 세로에 맞춤
        displayHeight = containerHeight;
        displayWidth = containerHeight * imageAspect;
        offsetX = (containerWidth - displayWidth) / 2;
        offsetY = 0;
      }
      
      const scaleX = displayWidth / naturalWidth;
      const scaleY = displayHeight / naturalHeight;

      console.log('🎯 정확한 어노테이션 좌표 계산:', {
        count: annotations.length,
        container: { width: containerWidth, height: containerHeight },
        natural: { width: naturalWidth, height: naturalHeight },
        display: { width: displayWidth, height: displayHeight },
        offset: { x: offsetX, y: offsetY },
        scale: { x: scaleX, y: scaleY }
      });

      return annotations.map((ann, index) => {
        const coords = ann.coordinates; // [x, y, width, height]
        if (!coords || coords.length !== 4) {
          console.warn('좌표 오류:', coords);
          return null;
        }

        const [x, y, width, height] = coords;
        
        // 🔥 viewer_v2와 동일한 방식으로 좌표 변환
        const scaledX = x * scaleX + offsetX;
        const scaledY = y * scaleY + offsetY;
        const scaledWidth = width * scaleX;
        const scaledHeight = height * scaleY;

        console.log(`🎯 어노테이션 ${index + 1} 정확한 변환:`, {
          original: [x, y, width, height],
          scaled: [scaledX, scaledY, scaledWidth, scaledHeight],
          계산과정: {
            scaledX: `${x} * ${scaleX} + ${offsetX} = ${scaledX}`,
            scaledY: `${y} * ${scaleY} + ${offsetY} = ${scaledY}`,
            scaledWidth: `${width} * ${scaleX} = ${scaledWidth}`,
            scaledHeight: `${height} * ${scaleY} = ${scaledHeight}`
          }
        });

        // 유효성 검사
        if (scaledWidth < 2 || scaledHeight < 2) {
          console.warn(`어노테이션 ${index + 1} 너무 작음:`, { scaledWidth, scaledHeight });
          return null;
        }

        return (
          <div key={ann.id}>
            {/* 어노테이션 박스 */}
            <div
              style={{
                position: 'absolute',
                left: scaledX,
                top: scaledY,
                width: scaledWidth,
                height: scaledHeight,
                border: '3px solid #ff6b6b',
                backgroundColor: 'rgba(255, 107, 107, 0.2)',
                borderRadius: '4px',
                pointerEvents: 'none',
                zIndex: 100,
                boxSizing: 'border-box'
              }}
            />
            
            {/* 라벨 */}
            <div
              style={{
                position: 'absolute',
                left: scaledX,
                top: Math.max(0, scaledY - 25), // 화면 위로 벗어나지 않게
                backgroundColor: '#ff6b6b',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold',
                zIndex: 101,
                whiteSpace: 'nowrap'
              }}
            >
              {ann.label}
            </div>
            
            {/* 의사 이름 */}
            <div
              style={{
                position: 'absolute',
                left: Math.max(0, scaledX + scaledWidth - 80),
                top: Math.min(containerHeight - 20, scaledY + scaledHeight + 5),
                backgroundColor: '#333',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '10px',
                zIndex: 101,
                maxWidth: '80px',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              👨‍⚕️ {ann.doctor_name}
            </div>
          </div>
        );
      });
    };

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
          <div>⏳ DICOM 로딩 중...</div>
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
          <div>❌ {viewerError}</div>
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
          <div>📷 이미지가 없습니다</div>
        </div>
      );
    }

    const currentImage = images[currentImageIndex];

    return (
      <div style={{ height: '100%', backgroundColor: '#000', display: 'flex', flexDirection: 'column' }}>
        {/* 헤더 */}
        <div style={{
          backgroundColor: '#2a2a2a',
          color: '#fff',
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            {patientInfo?.name || 'Unknown'} • 어노테이션: {annotations.length}개
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setShowAnnotations(!showAnnotations)}
              style={{
                padding: '4px 8px',
                backgroundColor: showAnnotations ? '#ff6b6b' : '#666',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              🏷️ {showAnnotations ? 'ON' : 'OFF'}
            </button>
            
            <button onClick={previousImage} disabled={currentImageIndex === 0}>◀</button>
            <span>{currentImageIndex + 1} / {images.length}</span>
            <button onClick={nextImage} disabled={currentImageIndex === images.length - 1}>▶</button>
          </div>
        </div>

        {/* 이미지 영역 */}
        <div 
          ref={imageContainerRef}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backgroundColor: '#000',
            position: 'relative'
          }}
        >
          <div style={{
            position: 'relative',
            maxWidth: '100%',
            maxHeight: '100%'
          }}>
            <img
              src={currentImage?.imageUrl}
              alt={`DICOM Image ${currentImageIndex + 1}`}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                display: 'block'
              }}
              onLoad={() => {
                console.log('🖼️ 이미지 로드 완료');
                // 이미지 로드 후 약간의 딜레이를 주고 다시 렌더링
                setTimeout(() => {
                  setAnnotations([...annotations]);
                }, 100);
              }}
            />
            
            {/* 🔥 어노테이션 오버레이 */}
            {renderAnnotations()}
          </div>
        </div>

        {/* 하단 어노테이션 리스트 */}
        {annotations.length > 0 && (
          <div style={{
            backgroundColor: '#1a1a1a',
            color: '#fff',
            padding: '8px 16px',
            borderTop: '1px solid #444',
            maxHeight: '100px',
            overflowY: 'auto'
          }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
              🏷️ 어노테이션 ({annotations.length}개)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {annotations.map((ann, index) => (
                <div key={ann.id} style={{
                  backgroundColor: '#333',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px'
                }}>
                  #{index + 1} {ann.label} - {ann.doctor_name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };
  // RealDicomViewer.jsx - Part 3/4
// 데이터 로드 및 이벤트 핸들러

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
  const PatientCard = ({ study, isSelected, onClick }) => {
    const baseCardStyle = {
      padding: '16px',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      border: '2px solid',
      marginBottom: '12px',
      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
      boxShadow: isSelected ? '0 8px 32px rgba(59, 130, 246, 0.3)' : '0 4px 16px rgba(0, 0, 0, 0.1)',
      backgroundColor: isSelected ? '#3b82f6' : '#ffffff',
      borderColor: isSelected ? '#2563eb' : '#e5e7eb',
      color: isSelected ? '#ffffff' : '#111827'
    };

    return (
      <div style={baseCardStyle} onClick={() => onClick(study)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 'bold',
            backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#dcfce7',
            color: isSelected ? '#ffffff' : '#166534'
          }}>
            <span style={{ 
              width: '6px', 
              height: '6px', 
              backgroundColor: isSelected ? '#ffffff' : '#10b981', 
              borderRadius: '50%', 
              marginRight: '6px'
            }}></span>
            {isSelected ? '선택됨' : '완료'}
          </div>
          
          {orthancStudies.length > 0 && selectedStudy?.id === study.id && (
            <div style={{
              fontSize: '10px',
              backgroundColor: '#fef3c7',
              color: '#d97706',
              padding: '2px 6px',
              borderRadius: '8px'
            }}>
              {orthancStudies.length}개 Study
            </div>
          )}
        </div>

        <div style={{ marginBottom: '12px' }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 'bold', 
            margin: '0 0 4px 0',
            color: isSelected ? '#ffffff' : '#111827'
          }}>
            {study.patient_name || '환자명 미상'}
          </h3>
          <p style={{ 
            fontSize: '12px', 
            margin: '0',
            color: isSelected ? 'rgba(255,255,255,0.8)' : '#6b7280'
          }}>
            ID: {study.patient_id}
          </p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '8px', 
          fontSize: '12px',
          marginBottom: '12px'
        }}>
          <div>
            <div style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : '#6b7280', marginBottom: '2px', fontSize: '10px' }}>성별</div>
            <div style={{ fontWeight: '500', color: isSelected ? '#ffffff' : '#111827' }}>
              {study.sex || '-'}
            </div>
          </div>
          <div>
            <div style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : '#6b7280', marginBottom: '2px', fontSize: '10px' }}>모달리티</div>
            <div style={{ fontWeight: '500', color: isSelected ? '#ffffff' : '#111827' }}>
              {study.modality || '-'}
            </div>
          </div>
        </div>

        <div style={{ fontSize: '12px', marginBottom: '12px' }}>
          <div style={{ color: isSelected ? 'rgba(255,255,255,0.7)' : '#6b7280', marginBottom: '2px', fontSize: '10px' }}>검사일</div>
          <div style={{ fontWeight: '500', color: isSelected ? '#ffffff' : '#111827' }}>
            {study.request_datetime ? new Date(study.request_datetime).toLocaleDateString() : '-'}
          </div>
        </div>

        <div style={{ 
          paddingTop: '12px', 
          borderTop: `1px solid ${isSelected ? 'rgba(255,255,255,0.2)' : '#e5e7eb'}`,
          textAlign: 'center'
        }}>
          <div style={{ 
            fontSize: '11px', 
            fontWeight: '500',
            color: isSelected ? 'rgba(255,255,255,0.9)' : '#6b7280'
          }}>
            {isSelected ? '✨ 현재 선택된 환자' : '👆 클릭하여 DICOM 이미지 보기'}
          </div>
        </div>
      </div>
    );
  };

  // 판독문 패널 컴포넌트
  const ReportPanel = () => (
    <div style={{ height: '100%', backgroundColor: '#f9fafb', overflow: 'hidden' }}>
      <div style={{ 
        padding: '16px', 
        borderBottom: '1px solid #e5e7eb', 
        backgroundColor: '#ffffff' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            backgroundColor: '#3b82f6', 
            borderRadius: '8px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <span style={{ fontSize: '16px' }}>📋</span>
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#111827', margin: '0 0 2px 0' }}>판독 리포트</h3>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '0' }}>
              {reportData ? '작성 완료' : '작성된 판독문이 없습니다'}
            </p>
          </div>
        </div>
      </div>

      {selectedStudy && (
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#dbeafe', 
          borderBottom: '1px solid #e5e7eb' 
        }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '12px', 
            fontSize: '12px' 
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

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {reportData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '6px 12px',
              borderRadius: '16px',
              fontSize: '12px',
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
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                marginRight: '6px',
                backgroundColor: reportData.report_status === 'completed' ? '#10b981' :
                               reportData.report_status === 'draft' ? '#f59e0b' : '#3b82f6'
              }}></span>
              {reportData.report_status === 'completed' ? '완료' : 
               reportData.report_status === 'draft' ? '초안' : '승인'}
            </div>

            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ 
                whiteSpace: 'pre-wrap', 
                color: '#111827', 
                lineHeight: '1.6',
                fontSize: '13px'
              }}>
                {reportData.dr_report}
              </div>
            </div>

            <div style={{
              backgroundColor: '#f3f4f6',
              borderRadius: '8px',
              padding: '12px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '12px', 
                fontSize: '12px' 
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
                width: '60px', 
                height: '60px', 
                backgroundColor: '#e5e7eb', 
                borderRadius: '12px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 12px auto' 
              }}>
                <span style={{ fontSize: '24px', opacity: 0.5 }}>📝</span>
              </div>
              <h4 style={{ fontSize: '16px', fontWeight: '500', color: '#6b7280', margin: '0 0 6px 0' }}>판독문이 없습니다</h4>
              <p style={{ color: '#9ca3af', margin: '0', fontSize: '12px' }}>이 검사에 대한 판독문이 아직 작성되지 않았습니다.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // RealDicomViewer.jsx - Part 4/4
// 메인 렌더링 및 스타일

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
            width: '60px',
            height: '60px',
            border: '3px solid #3b82f6',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px auto'
          }}></div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '6px' }}>시스템 로딩 중</div>
          <div style={{ color: '#3b82f6', fontSize: '14px' }}>의료영상 정보를 불러오고 있습니다...</div>
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
            width: '60px',
            height: '60px',
            backgroundColor: '#fee2e2',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto'
          }}>
            <span style={{ fontSize: '32px' }}>⚠️</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '12px' }}>시스템 오류</div>
          <div style={{
            color: '#dc2626',
            marginBottom: '16px',
            backgroundColor: '#fef2f2',
            borderRadius: '8px',
            padding: '12px',
            border: '1px solid #fecaca',
            fontSize: '13px'
          }}>
            {error}
          </div>
          <button 
            onClick={loadCompletedStudies}
            style={{
              padding: '8px 24px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              fontSize: '14px'
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
        width: '320px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #d1d5db',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '2px 0 4px rgba(0, 0, 0, 0.1)'
      }}>
        {/* 헤더 */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #e5e7eb',
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '20px' }}>🩻</span>
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 2px 0' }}>DICOM Viewer</h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', margin: '0' }}>
                검사완료 환자 목록 ({completedStudies.length}건)
              </p>
            </div>
          </div>
        </div>
        
        {/* 환자 카드 목록 */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px'
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
            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
              <div style={{
                width: '60px',
                height: '60px',
                backgroundColor: '#f3f4f6',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto'
              }}>
                <span style={{ fontSize: '32px' }}>📭</span>
              </div>
              <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '6px', color: '#111827' }}>
                검사 완료된 환자가 없습니다
              </div>
              <div style={{ color: '#6b7280', fontSize: '12px' }}>새로운 검사 완료를 기다리고 있습니다</div>
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
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ textAlign: 'center', color: '#ffffff' }}>
              <div style={{
                width: '120px',
                height: '120px',
                background: 'rgba(75, 85, 99, 0.3)',
                borderRadius: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px auto'
              }}>
                <span style={{ fontSize: '64px' }}>🩻</span>
              </div>
              <div style={{
                fontSize: '32px',
                fontWeight: 'bold',
                marginBottom: '12px',
                color: '#3b82f6'
              }}>
                DICOM Viewer
              </div>
              <div style={{
                color: '#d1d5db',
                fontSize: '16px',
                marginBottom: '24px'
              }}>
                {selectedStudy ? 
                  `${selectedStudy.patient_name}의 DICOM 이미지를 로딩 중...` : 
                  '왼쪽에서 환자 카드를 클릭하여 DICOM 이미지를 확인하세요'
                }
              </div>
              
              {/* 기능 안내 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px',
                maxWidth: '600px',
                margin: '0 auto'
              }}>
                <div style={{
                  background: 'rgba(75, 85, 99, 0.5)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid rgba(75, 85, 99, 0.3)'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>👆</div>
                  <div style={{ fontWeight: '500', color: '#e5e7eb', fontSize: '14px' }}>환자 선택</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>카드를 클릭하여 시작</div>
                </div>
                <div style={{
                  background: 'rgba(75, 85, 99, 0.5)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid rgba(75, 85, 99, 0.3)'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>🩻</div>
                  <div style={{ fontWeight: '500', color: '#e5e7eb', fontSize: '14px' }}>이미지 뷰어</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>DICOM 영상 확인</div>
                </div>
                <div style={{
                  background: 'rgba(75, 85, 99, 0.5)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid rgba(75, 85, 99, 0.3)'
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>📋</div>
                  <div style={{ fontWeight: '500', color: '#e5e7eb', fontSize: '14px' }}>판독 리포트</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>판독문 내용 확인</div>
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
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '6px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '8px',
        border: '1px solid #d1d5db',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
        zIndex: 1000
      }}>
        <button
          onClick={() => setViewerLayout('viewer')}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '12px',
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
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '12px',
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
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '12px',
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