// frontend/src/components/RIS/CornerstoneViewer.jsx

import React, { useEffect, useRef, useState } from 'react';

const CornerstoneViewer = ({ 
  studyUid, 
  onImageChange,
  className = "",
  style = {} 
}) => {
  const viewerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageInfo, setImageInfo] = useState(null);
  const [currentTool, setCurrentTool] = useState('pan');
  const [images, setImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // API 기본 URL (기존 프로젝트 설정 사용)
  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://35.225.63.41:8000';
  const ORTHANC_URL = process.env.REACT_APP_ORTHANC_URL || 'http://35.225.63.41:8042';

  // 뷰어 ID 생성
  const viewerId = `cornerstone-viewer-${Date.now()}`;

  // studyUid 변경시 이미지 로드
  useEffect(() => {
    if (studyUid) {
      loadDicomImages(studyUid);
    }
  }, [studyUid]);

  // DICOM 이미지 로드
  const loadDicomImages = async (studyUid) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🖼️ DICOM 이미지 로드 시작:', studyUid);

      // 1. Orthanc에서 Study 검색
      const searchResponse = await fetch(`${ORTHANC_URL}/tools/find`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa('orthanc:orthanc')
        },
        body: JSON.stringify({
          "Level": "Study",
          "Query": {
            "StudyInstanceUID": studyUid
          }
        })
      });

      if (!searchResponse.ok) {
        throw new Error(`Study 검색 실패: ${searchResponse.status}`);
      }

      const studyIds = await searchResponse.json();
      if (studyIds.length === 0) {
        throw new Error('해당 Study를 찾을 수 없습니다');
      }

      // 2. 첫 번째 Study의 Series 목록 가져오기
      const orthancStudyId = studyIds[0];
      const studyResponse = await fetch(`${ORTHANC_URL}/studies/${orthancStudyId}`, {
        headers: {
          'Authorization': 'Basic ' + btoa('orthanc:orthanc')
        }
      });

      if (!studyResponse.ok) {
        throw new Error('Study 정보 조회 실패');
      }

      const studyData = await studyResponse.json();
      const seriesIds = studyData.Series || [];

      if (seriesIds.length === 0) {
        throw new Error('Series가 없습니다');
      }

      // 3. 첫 번째 Series의 인스턴스 목록 가져오기
      const firstSeriesId = seriesIds[0];
      const seriesResponse = await fetch(`${ORTHANC_URL}/series/${firstSeriesId}`, {
        headers: {
          'Authorization': 'Basic ' + btoa('orthanc:orthanc')
        }
      });

      if (!seriesResponse.ok) {
        throw new Error('Series 정보 조회 실패');
      }

      const seriesData = await seriesResponse.json();
      const instanceIds = seriesData.Instances || [];

      if (instanceIds.length === 0) {
        throw new Error('이미지가 없습니다');
      }

      // 4. 이미지 URL 목록 생성
      const imageList = instanceIds.map((instanceId, index) => ({
        id: instanceId,
        imageUrl: `${ORTHANC_URL}/instances/${instanceId}/preview`,
        downloadUrl: `${ORTHANC_URL}/instances/${instanceId}/file`,
        instanceNumber: index + 1
      }));

      setImages(imageList);
      setCurrentImageIndex(0);

      // 5. 환자 정보 가져오기
      if (instanceIds.length > 0) {
        const instanceResponse = await fetch(`${ORTHANC_URL}/instances/${instanceIds[0]}`, {
          headers: {
            'Authorization': 'Basic ' + btoa('orthanc:orthanc')
          }
        });

        if (instanceResponse.ok) {
          const instanceData = await instanceResponse.json();
          const mainTags = instanceData.MainDicomTags || {};
          
          setImageInfo({
            patientName: instanceData.PatientMainDicomTags?.PatientName || 'Unknown',
            studyDate: mainTags.StudyDate || '',
            modality: mainTags.Modality || '',
            seriesDescription: mainTags.SeriesDescription || '',
            instanceCount: imageList.length
          });
        }
      }

      console.log('✅ DICOM 이미지 로드 완료:', imageList.length, '개');

    } catch (err) {
      console.error('❌ DICOM 이미지 로드 실패:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 다음 이미지
  const nextImage = () => {
    if (currentImageIndex < images.length - 1) {
      const newIndex = currentImageIndex + 1;
      setCurrentImageIndex(newIndex);
      
      if (onImageChange) {
        onImageChange({
          imageIndex: newIndex,
          totalImages: images.length,
          studyUid: studyUid
        });
      }
    }
  };

  // 이전 이미지
  const previousImage = () => {
    if (currentImageIndex > 0) {
      const newIndex = currentImageIndex - 1;
      setCurrentImageIndex(newIndex);
      
      if (onImageChange) {
        onImageChange({
          imageIndex: newIndex,
          totalImages: images.length,
          studyUid: studyUid
        });
      }
    }
  };

  // 특정 이미지로 이동
  const goToImage = (index) => {
    if (index >= 0 && index < images.length) {
      setCurrentImageIndex(index);
      
      if (onImageChange) {
        onImageChange({
          imageIndex: index,
          totalImages: images.length,
          studyUid: studyUid
        });
      }
    }
  };

  // 키보드 이벤트 처리
  const handleKeyDown = (event) => {
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        event.preventDefault();
        nextImage();
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
        event.preventDefault();
        previousImage();
        break;
      default:
        break;
    }
  };

  // 마우스 휠 이벤트 처리
  const handleWheel = (event) => {
    event.preventDefault();
    if (event.deltaY > 0) {
      nextImage();
    } else {
      previousImage();
    }
  };

  // 로딩 상태
  if (loading) {
    return (
      <div 
        className={`flex items-center justify-center h-full bg-black ${className}`} 
        style={style}
      >
        <div className="text-center text-white">
          <div className="text-2xl mb-2">🔄</div>
          <div>DICOM 이미지 로딩 중...</div>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div 
        className={`flex items-center justify-center h-full bg-red-50 ${className}`} 
        style={style}
      >
        <div className="text-center">
          <div className="text-red-600 mb-2">❌ {error}</div>
          <button 
            onClick={() => studyUid && loadDicomImages(studyUid)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // 이미지가 없는 경우
  if (images.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center h-full bg-gray-100 ${className}`} 
        style={style}
      >
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">🖼️</div>
          <div>표시할 이미지가 없습니다</div>
        </div>
      </div>
    );
  }

  const currentImage = images[currentImageIndex];

  return (
    <div 
      className={`relative bg-black ${className}`} 
      style={style}
      onKeyDown={handleKeyDown}
      onWheel={handleWheel}
      tabIndex={0}
    >
      {/* 상단 툴바 */}
      <div className="absolute top-4 left-4 z-20 bg-gray-800 bg-opacity-90 rounded-lg p-3 text-white">
        <div className="flex items-center space-x-4 text-sm">
          <div>
            <span className="font-medium">환자:</span> {imageInfo?.patientName || 'Unknown'}
          </div>
          <div>
            <span className="font-medium">날짜:</span> {imageInfo?.studyDate || 'N/A'}
          </div>
          <div>
            <span className="font-medium">모달리티:</span> {imageInfo?.modality || 'N/A'}
          </div>
        </div>
      </div>

      {/* 이미지 정보 */}
      <div className="absolute top-4 right-4 z-20 bg-gray-800 bg-opacity-90 text-white p-3 rounded-lg text-sm">
        <div>
          Image: {currentImageIndex + 1} / {images.length}
        </div>
        {imageInfo?.seriesDescription && (
          <div className="mt-1">
            Series: {imageInfo.seriesDescription}
          </div>
        )}
      </div>

      {/* 메인 이미지 */}
      <div className="w-full h-full flex items-center justify-center">
        <img 
          src={currentImage.imageUrl}
          alt={`DICOM Image ${currentImageIndex + 1}`}
          className="max-w-full max-h-full object-contain"
          style={{ imageRendering: 'pixelated' }}
          onError={(e) => {
            console.error('이미지 로드 실패:', e);
            e.target.style.display = 'none';
          }}
        />
      </div>

      {/* 하단 네비게이션 */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex items-center space-x-2 bg-gray-800 bg-opacity-90 rounded-lg p-2">
            <button 
              onClick={previousImage}
              disabled={currentImageIndex <= 0}
              className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            
            <div className="flex items-center space-x-1">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToImage(index)}
                  className={`w-2 h-2 rounded-full ${
                    index === currentImageIndex ? 'bg-blue-500' : 'bg-gray-400'
                  }`}
                  title={`Image ${index + 1}`}
                />
              ))}
            </div>
            
            <span className="text-white text-sm px-2">
              {currentImageIndex + 1} / {images.length}
            </span>
            
            <button 
              onClick={nextImage}
              disabled={currentImageIndex >= images.length - 1}
              className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* 썸네일 뷰 (옵션) */}
      {images.length > 1 && (
        <div className="absolute left-4 bottom-4 z-20 bg-gray-800 bg-opacity-90 rounded-lg p-2 max-h-32 overflow-y-auto">
          <div className="space-y-1">
            {images.map((image, index) => (
              <div
                key={image.id}
                onClick={() => goToImage(index)}
                className={`w-16 h-16 bg-gray-600 rounded cursor-pointer border-2 ${
                  index === currentImageIndex ? 'border-blue-500' : 'border-transparent'
                } hover:border-white transition-colors`}
              >
                <img 
                  src={image.imageUrl}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover rounded"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 사용법 안내 */}
      <div className="absolute bottom-4 right-4 z-20 bg-gray-800 bg-opacity-90 text-white p-2 rounded text-xs">
        <div>키보드: ↑↓ 또는 ←→ 이미지 이동</div>
        <div>마우스 휠: 이미지 스크롤</div>
        <div>썸네일: 클릭하여 바로 이동</div>
      </div>
    </div>
  );
};

export default CornerstoneViewer;