import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  User, 
  Image,
  RefreshCw,
  Eye,
  Stethoscope,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Move,
  MousePointer,
  Circle,
  Square,
  Ruler,
  Pencil,
  Type,
  Save,
  Download,
  FileText,
  Activity,
  Camera,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const DMViewer = () => {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [studyList, setStudyList] = useState([]);
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [seriesList, setSeriesList] = useState([]);
  const [instancesList, setInstancesList] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loadingImages, setLoadingImages] = useState(false);
  
  // Cornerstone viewer states
  const viewerRef = useRef(null);
  const cornerstoneElement = useRef(null);
  const [viewerInitialized, setViewerInitialized] = useState(false);
  const [currentTool, setCurrentTool] = useState('pan');
  const [annotations, setAnnotations] = useState([]);
  const [currentAnnotation, setCurrentAnnotation] = useState(null);
  const [reportData, setReportData] = useState('');
  const [reportStatus, setReportStatus] = useState('draft');
  const [currentImageElement, setCurrentImageElement] = useState(null);
  
  // API endpoints
  const API_BASE = 'http://35.225.63.41:8000/api/integration/';
  const ORTHANC_BASE = 'http://35.225.63.41:8042';
  const ANNOTATION_API = 'http://35.225.63.41:8000/api/dr_annotations/';
  const REPORT_API = 'http://35.225.63.41:8000/api/dr_reports/';

  // Cornerstone.js 초기화
  useEffect(() => {
    const initCornerstone = async () => {
      try {
        if (!window.cornerstone) {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/cornerstone-core@2.6.1/dist/cornerstone.min.js';
          script.onload = () => {
            const toolsScript = document.createElement('script');
            toolsScript.src = 'https://unpkg.com/cornerstone-tools@6.0.10/dist/cornerstoneTools.min.js';
            toolsScript.onload = () => initializeViewer();
            document.head.appendChild(toolsScript);
          };
          document.head.appendChild(script);
        } else {
          initializeViewer();
        }
      } catch (error) {
        console.error('Cornerstone 초기화 실패:', error);
      }
    };

    const initializeViewer = () => {
      if (cornerstoneElement.current && window.cornerstone) {
        try {
          window.cornerstone.enable(cornerstoneElement.current);
          
          if (window.cornerstoneTools) {
            window.cornerstoneTools.external.cornerstone = window.cornerstone;
            window.cornerstoneTools.init();
            
            // WADO Image Loader 설정
            window.cornerstone.registerImageLoader('wadouri', function(imageId) {
              return new Promise((resolve, reject) => {
                const url = imageId.replace('wadouri:', '');
                fetch(url, {
                  headers: {
                    'Authorization': 'Basic ' + btoa('orthanc:orthanc')
                  }
                })
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => {
                  const image = {
                    imageId: imageId,
                    minPixelValue: 0,
                    maxPixelValue: 255,
                    slope: 1.0,
                    intercept: 0,
                    windowCenter: 127,
                    windowWidth: 256,
                    render: window.cornerstone.renderGrayscaleImage,
                    getPixelData: () => new Uint8Array(arrayBuffer),
                    rows: 512,
                    columns: 512,
                    height: 512,
                    width: 512,
                    color: false,
                    columnPixelSpacing: 1.0,
                    rowPixelSpacing: 1.0,
                    invert: false,
                    sizeInBytes: arrayBuffer.byteLength
                  };
                  resolve(image);
                })
                .catch(reject);
              });
            });
            
            const PanTool = window.cornerstoneTools.PanTool;
            const ZoomTool = window.cornerstoneTools.ZoomTool;
            const WwwcTool = window.cornerstoneTools.WwwcTool;
            const LengthTool = window.cornerstoneTools.LengthTool;
            const RectangleROITool = window.cornerstoneTools.RectangleRoiTool;
            
            window.cornerstoneTools.addTool(PanTool);
            window.cornerstoneTools.addTool(ZoomTool);
            window.cornerstoneTools.addTool(WwwcTool);
            window.cornerstoneTools.addTool(LengthTool);
            window.cornerstoneTools.addTool(RectangleROITool);
            
            window.cornerstoneTools.setToolActive('Pan', { mouseButtonMask: 1 });
          }
          
          setViewerInitialized(true);
          console.log('✅ Cornerstone 뷰어 초기화 완료');
        } catch (error) {
          console.error('❌ Cornerstone 뷰어 초기화 실패:', error);
        }
      }
    };

    initCornerstone();
    return () => {
      if (cornerstoneElement.current && window.cornerstone) {
        try {
          window.cornerstone.disable(cornerstoneElement.current);
        } catch (error) {
          console.error('Cornerstone cleanup 오류:', error);
        }
      }
    };
  }, []);

  // 환자 목록 가져오기
  const fetchAssignedPatients = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}identifier-waiting/`);
      const data = await response.json();
      
      const normalizedPatients = (data.results || data || []).map(patient => ({
        id: patient.mapping_id || patient.uuid || patient.id,
        uuid: patient.patient_uuid || patient.uuid || patient.id,
        name: patient.display || patient.name || patient.patient_name || '이름없음',
        identifier: patient.patient_identifier || patient.identifier || 'N/A',
        patient_id: patient.patient_identifier || patient.identifier || patient.uuid,
        birthdate: patient.person?.birthdate || patient.birthdate,
        gender: patient.person?.gender || patient.gender,
        modality: patient.modality || 'CT'
      }));
      
      setAssignedPatients(normalizedPatients);
    } catch (error) {
      console.error('환자 목록 조회 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // Patient ID로 Orthanc에서 Studies 조회
  const fetchPatientStudiesFromOrthanc = async (patient) => {
    try {
      setStudyList([]);
      setLoadingImages(true);
      
      console.log('🔍 Patient ID로 Orthanc Studies 조회:', patient.patient_id);
      
      // Orthanc Patient ID로 직접 Studies 조회
      const response = await fetch(`${ORTHANC_BASE}/patients/${patient.patient_id}`, {
        headers: {
          'Authorization': 'Basic ' + btoa('orthanc:orthanc')
        }
      });
      
      if (!response.ok) {
        throw new Error(`Patient not found in Orthanc: ${patient.patient_id}`);
      }
      
      const patientData = await response.json();
      console.log('📋 Orthanc Patient Data:', patientData);
      
      // Studies 목록 조회
      const studies = [];
      for (const studyId of patientData.Studies || []) {
        try {
          const studyResponse = await fetch(`${ORTHANC_BASE}/studies/${studyId}`, {
            headers: {
              'Authorization': 'Basic ' + btoa('orthanc:orthanc')
            }
          });
          
          if (studyResponse.ok) {
            const studyData = await studyResponse.json();
            const mainTags = studyData.MainDicomTags || {};
            
            studies.push({
              orthanc_study_id: studyId,
              study_instance_uid: mainTags.StudyInstanceUID,
              study_description: mainTags.StudyDescription || 'Unknown Study',
              study_date: mainTags.StudyDate,
              study_time: mainTags.StudyTime,
              modality: mainTags.Modality,
              accession_number: mainTags.AccessionNumber,
              series_count: studyData.Series?.length || 0,
              series_ids: studyData.Series || []
            });
          }
        } catch (studyError) {
          console.warn('Study 조회 실패:', studyId, studyError);
        }
      }
      
      setStudyList(studies);
      console.log('✅ Orthanc Studies 조회 완료:', studies.length, '개');
      
    } catch (error) {
      console.error('❌ Orthanc Studies 조회 실패:', error);
      alert(`Orthanc에서 Patient ID "${patient.patient_id}"를 찾을 수 없습니다.`);
    } finally {
      setLoadingImages(false);
    }
  };

  // Series 목록 조회
  const fetchSeriesFromStudy = async (study) => {
    try {
      setSeriesList([]);
      setCurrentImageIndex(0);
      
      const series = [];
      for (const seriesId of study.series_ids || []) {
        try {
          const seriesResponse = await fetch(`${ORTHANC_BASE}/series/${seriesId}`, {
            headers: {
              'Authorization': 'Basic ' + btoa('orthanc:orthanc')
            }
          });
          
          if (seriesResponse.ok) {
            const seriesData = await seriesResponse.json();
            const mainTags = seriesData.MainDicomTags || {};
            
            series.push({
              orthanc_series_id: seriesId,
              series_instance_uid: mainTags.SeriesInstanceUID,
              series_description: mainTags.SeriesDescription || 'Unknown Series',
              series_number: mainTags.SeriesNumber,
              modality: mainTags.Modality,
              instances_count: seriesData.Instances?.length || 0,
              instances_ids: seriesData.Instances || []
            });
          }
        } catch (seriesError) {
          console.warn('Series 조회 실패:', seriesId, seriesError);
        }
      }
      
      setSeriesList(series);
      
      // 첫 번째 Series 자동 선택
      if (series.length > 0) {
        await fetchInstancesFromSeries(series[0]);
      }
      
    } catch (error) {
      console.error('Series 조회 실패:', error);
    }
  };

  // Instances 목록 조회
  const fetchInstancesFromSeries = async (series) => {
    try {
      setSelectedSeries(series);
      setInstancesList([]);
      setCurrentImageIndex(0);
      
      const instances = [];
      for (const instanceId of series.instances_ids || []) {
        try {
          const instanceResponse = await fetch(`${ORTHANC_BASE}/instances/${instanceId}`, {
            headers: {
              'Authorization': 'Basic ' + btoa('orthanc:orthanc')
            }
          });
          
          if (instanceResponse.ok) {
            const instanceData = await instanceResponse.json();
            const mainTags = instanceData.MainDicomTags || {};
            
            instances.push({
              orthanc_instance_id: instanceId,
              instance_number: parseInt(mainTags.InstanceNumber) || instances.length + 1,
              sop_instance_uid: mainTags.SOPInstanceUID,
              image_url: `${ORTHANC_BASE}/instances/${instanceId}/preview`,
              dicom_url: `wadouri:${ORTHANC_BASE}/instances/${instanceId}/file`
            });
          }
        } catch (instanceError) {
          console.warn('Instance 조회 실패:', instanceId, instanceError);
        }
      }
      
      // Instance Number로 정렬
      instances.sort((a, b) => a.instance_number - b.instance_number);
      setInstancesList(instances);
      
      // 첫 번째 이미지 표시
      if (instances.length > 0) {
        await displayDicomImage(instances[0], 0);
      }
      
    } catch (error) {
      console.error('Instances 조회 실패:', error);
    }
  };

  // 실제 DICOM 이미지 표시
  const displayDicomImage = async (instance, index) => {
    if (!cornerstoneElement.current || !viewerInitialized) return;
    
    try {
      setCurrentImageIndex(index);
      setCurrentImageElement(instance);
      
      console.log('🖼️ DICOM 이미지 로딩:', instance.dicom_url);
      
      // Cornerstone으로 DICOM 이미지 로드
      const element = cornerstoneElement.current;
      const imageId = instance.dicom_url;
      
      await window.cornerstone.loadAndCacheImage(imageId);
      await window.cornerstone.displayImage(element, imageId);
      
      // 기존 어노테이션 그리기
      drawAnnotationsOnCanvas();
      
      console.log('✅ DICOM 이미지 표시 완료');
      
    } catch (error) {
      console.error('❌ DICOM 이미지 표시 실패:', error);
      
      // 실패시 미리보기 이미지로 대체
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = cornerstoneElement.current;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          drawAnnotationsOnCanvas();
        };
        img.src = instance.image_url + '?auth=' + btoa('orthanc:orthanc');
      } catch (previewError) {
        console.error('미리보기 이미지도 실패:', previewError);
      }
    }
  };

  // 어노테이션 로드
  const loadAnnotations = async (studyUID) => {
    try {
      const response = await fetch(`${ANNOTATION_API}${studyUID}/`);
      const data = await response.json();
      
      if (data.status === 'success') {
        setAnnotations(data.annotations || []);
        console.log('✅ 어노테이션 로드 완료:', data.annotations?.length || 0, '개');
        drawAnnotationsOnCanvas();
      }
    } catch (error) {
      console.error('어노테이션 로드 실패:', error);
    }
  };

  // 리포트 로드
  const loadReport = async (studyUID) => {
    try {
      const response = await fetch(`${REPORT_API}${studyUID}/`);
      const data = await response.json();
      
      if (data.status === 'success' && data.report) {
        setReportData(data.report.dr_report || '');
        setReportStatus(data.report.report_status || 'draft');
        console.log('✅ 리포트 로드 완료');
      } else {
        setReportData('');
        setReportStatus('draft');
      }
    } catch (error) {
      console.error('리포트 로드 실패:', error);
      setReportData('');
      setReportStatus('draft');
    }
  };

  // Study 선택 처리
  const handleStudySelect = async (study) => {
    setSelectedStudy(study);
    setCurrentImageIndex(0);
    
    // Series 로드
    await fetchSeriesFromStudy(study);
    
    // 어노테이션과 리포트 로드
    if (study.study_instance_uid) {
      await loadAnnotations(study.study_instance_uid);
      await loadReport(study.study_instance_uid);
    }
  };

  // Canvas에 어노테이션 그리기
  const drawAnnotationsOnCanvas = () => {
    if (!cornerstoneElement.current) return;
    
    const canvas = cornerstoneElement.current;
    const ctx = canvas.getContext('2d');
    
    // 기존 어노테이션 그리기
    annotations.forEach((annotation, index) => {
      if (annotation.bbox && annotation.bbox.length === 4) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(annotation.bbox[0], annotation.bbox[1], 
                      annotation.bbox[2] - annotation.bbox[0], 
                      annotation.bbox[3] - annotation.bbox[1]);
        
        // 라벨 표시
        ctx.fillStyle = '#ff0000';
        ctx.font = '12px Arial';
        ctx.fillText(annotation.label, annotation.bbox[0], annotation.bbox[1] - 5);
      }
    });
    
    // 현재 그리는 어노테이션
    if (currentAnnotation) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      const bbox = currentAnnotation;
      ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
    }
  };

  // 마우스 이벤트 처리 (어노테이션 그리기)
  const handleMouseDown = (e) => {
    if (currentTool !== 'rectangle') return;
    
    const rect = cornerstoneElement.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentAnnotation({ x, y, width: 0, height: 0, isDrawing: true });
  };

  const handleMouseMove = (e) => {
    if (!currentAnnotation?.isDrawing) return;
    
    const rect = cornerstoneElement.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    setCurrentAnnotation(prev => ({
      ...prev,
      width: currentX - prev.x,
      height: currentY - prev.y
    }));
    
    drawAnnotationsOnCanvas();
  };

  const handleMouseUp = (e) => {
    if (!currentAnnotation?.isDrawing) return;
    
    const label = prompt('어노테이션 라벨을 입력하세요:');
    if (!label) {
      setCurrentAnnotation(null);
      drawAnnotationsOnCanvas();
      return;
    }
    
    const bbox = [
      currentAnnotation.x,
      currentAnnotation.y,
      currentAnnotation.x + currentAnnotation.width,
      currentAnnotation.y + currentAnnotation.height
    ];
    
    const newAnnotation = {
      label,
      bbox,
      confidence: 1.0,
      created: new Date().toISOString(),
      dr_text: '',
      doctor_name: '김영상'
    };
    
    setAnnotations(prev => [...prev, newAnnotation]);
    setCurrentAnnotation(null);
    drawAnnotationsOnCanvas();
  };

  // 도구 변경
  const changeTool = (toolName) => {
    setCurrentTool(toolName);
    setCurrentAnnotation(null);
  };

  // 어노테이션 저장
  const saveAnnotations = async () => {
    if (!selectedStudy || annotations.length === 0) {
      alert('저장할 어노테이션이 없습니다.');
      return;
    }

    try {
      const response = await fetch(`${ANNOTATION_API}save/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          study_uid: selectedStudy.study_instance_uid,
          annotations: annotations.map(ann => ({
            label: ann.label,
            bbox: ann.bbox,
            dr_text: ann.dr_text || ''
          }))
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        alert(`✅ ${data.data?.saved_count || annotations.length}개 어노테이션이 저장되었습니다.`);
      } else {
        alert('❌ 어노테이션 저장 실패: ' + data.message);
      }
    } catch (error) {
      console.error('어노테이션 저장 실패:', error);
      alert('❌ 어노테이션 저장 중 오류가 발생했습니다.');
    }
  };

  // 리포트 저장
  const saveReport = async () => {
    if (!selectedStudy) {
      alert('Study가 선택되지 않았습니다.');
      return;
    }

    try {
      const response = await fetch(`${REPORT_API}save/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          study_uid: selectedStudy.study_instance_uid,
          patient_id: selectedPatient.patient_id,
          report_content: reportData,
          report_status: reportStatus
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        alert('✅ 리포트가 저장되었습니다.');
      } else {
        alert('❌ 리포트 저장 실패: ' + data.message);
      }
    } catch (error) {
      console.error('리포트 저장 실패:', error);
      alert('❌ 리포트 저장 중 오류가 발생했습니다.');
    }
  };

  // 이미지 네비게이션
  const navigateImage = (direction) => {
    if (instancesList.length === 0) return;
    
    let newIndex = currentImageIndex;
    if (direction === 'next' && currentImageIndex < instancesList.length - 1) {
      newIndex = currentImageIndex + 1;
    } else if (direction === 'prev' && currentImageIndex > 0) {
      newIndex = currentImageIndex - 1;
    }
    
    if (newIndex !== currentImageIndex) {
      displayDicomImage(instancesList[newIndex], newIndex);
    }
  };

  // 검색 필터링
  const filteredPatients = assignedPatients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.patient_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchAssignedPatients();
  }, []);

  const styles = {
    container: {
      display: 'flex',
      height: '100vh',
      backgroundColor: '#f5f5f5'
    },
    sidebar: {
      width: '320px',
      backgroundColor: 'white',
      borderRight: '1px solid #e0e0e0',
      display: 'flex',
      flexDirection: 'column'
    },
    header: {
      padding: '16px',
      borderBottom: '1px solid #e0e0e0'
    },
    title: {
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#333',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '12px'
    },
    searchInput: {
      width: '100%',
      paddingLeft: '36px',
      paddingRight: '12px',
      paddingTop: '8px',
      paddingBottom: '8px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px'
    },
    patientList: {
      flex: 1,
      overflowY: 'auto'
    },
    patientItem: {
      padding: '12px 16px',
      borderBottom: '1px solid #f3f4f6',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    patientItemSelected: {
      backgroundColor: '#dbeafe',
      borderLeft: '4px solid #3b82f6'
    },
    mainArea: {
      flex: 1,
      display: 'flex'
    },
    viewerArea: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#000'
    },
    toolbar: {
      padding: '12px',
      backgroundColor: '#1f2937',
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      flexWrap: 'wrap'
    },
    toolButton: {
      padding: '8px',
      backgroundColor: '#374151',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '12px'
    },
    toolButtonActive: {
      backgroundColor: '#3b82f6'
    },
    viewerContainer: {
      flex: 1,
      position: 'relative',
      backgroundColor: '#000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    dicomViewer: {
      width: '512px',
      height: '512px',
      backgroundColor: '#000',
      border: '1px solid #333',
      cursor: currentTool === 'rectangle' ? 'crosshair' : 'default'
    },
    imageNavigation: {
      position: 'absolute',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '8px',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: '8px 16px',
      borderRadius: '8px',
      color: 'white'
    },
    navButton: {
      padding: '4px 8px',
      backgroundColor: '#374151',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    },
    reportPanel: {
      width: '350px',
      backgroundColor: 'white',
      borderLeft: '1px solid #e0e0e0',
      display: 'flex',
      flexDirection: 'column'
    },
    reportHeader: {
      padding: '16px',
      borderBottom: '1px solid #e0e0e0',
      backgroundColor: '#f8f9fa'
    },
    reportContent: {
      flex: 1,
      padding: '16px',
      overflowY: 'auto'
    },
    reportTextarea: {
      width: '100%',
      minHeight: '150px',
      padding: '12px',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      fontSize: '14px',
      resize: 'vertical',
      fontFamily: 'inherit'
    },
    statusSelect: {
      width: '100%',
      padding: '8px',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      marginBottom: '12px'
    },
    saveButton: {
      padding: '8px 16px',
      backgroundColor: '#10b981',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      marginBottom: '8px'
    },
    annotationList: {
      maxHeight: '120px',
      overflowY: 'auto',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      marginBottom: '16px'
    },
    annotationItem: {
      padding: '8px',
      borderBottom: '1px solid #f0f0f0',
      fontSize: '12px'
    },
    studyItem: {
      padding: '8px',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      marginBottom: '8px',
      cursor: 'pointer'
    },
    studyItemSelected: {
      backgroundColor: '#eff6ff',
      borderColor: '#3b82f6'
    },
    seriesItem: {
      padding: '6px',
      border: '1px solid #d1d5db',
      borderRadius: '3px',
      marginBottom: '4px',
      cursor: 'pointer',
      fontSize: '12px'
    },
    seriesItemSelected: {
      backgroundColor: '#dbeafe',
      borderColor: '#3b82f6'
    }
  };

  return (
    <div style={styles.container}>
      {/* 좌측 환자 목록 */}
      <div style={styles.sidebar}>
        <div style={styles.header}>
          <div style={styles.title}>
            <Stethoscope size={20} color="#3b82f6" />
            DICOM Viewer
          </div>
          
          <div style={{position: 'relative'}}>
            <Search style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af'}} size={16} />
            <input
              type="text"
              placeholder="환자 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        </div>

        <div style={styles.patientList}>
          {loading && (
            <div style={{textAlign: 'center', padding: '20px'}}>
              <RefreshCw className="animate-spin" size={20} />
              <div>로딩 중...</div>
            </div>
          )}

          {!loading && filteredPatients.map(patient => (
            <div
              key={patient.id}
              onClick={() => {
                setSelectedPatient(patient);
                fetchPatientStudiesFromOrthanc(patient);
              }}
              style={{
                ...styles.patientItem,
                ...(selectedPatient?.id === patient.id ? styles.patientItemSelected : {})
              }}
            >
              <div style={{fontWeight: 'medium', marginBottom: '4px'}}>{patient.name}</div>
              <div style={{fontSize: '12px', color: '#6b7280'}}>
                Patient ID: <strong>{patient.patient_id}</strong>
              </div>
              <div style={{fontSize: '11px', color: '#6b7280'}}>
                {patient.identifier} | {patient.modality}
              </div>
            </div>
          ))}

          {/* Studies 목록 */}
          {selectedPatient && studyList.length > 0 && (
            <div style={{borderTop: '2px solid #e0e0e0', padding: '16px'}}>
              <h4 style={{margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold'}}>
                📋 Studies ({studyList.length}개)
              </h4>
              {studyList.map(study => (
                <div
                  key={study.orthanc_study_id}
                  onClick={() => handleStudySelect(study)}
                  style={{
                    ...styles.studyItem,
                    ...(selectedStudy?.orthanc_study_id === study.orthanc_study_id ? styles.studyItemSelected : {})
                  }}
                >
                  <div style={{fontSize: '12px', fontWeight: 'bold'}}>{study.study_description}</div>
                  <div style={{fontSize: '11px', color: '#6b7280'}}>
                    {study.study_date} | {study.modality} | {study.series_count} Series
                  </div>
                  <div style={{fontSize: '10px', color: '#9ca3af'}}>
                    UID: {study.study_instance_uid?.substring(0, 30)}...
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Series 목록 */}
          {selectedStudy && seriesList.length > 0 && (
            <div style={{borderTop: '1px solid #e0e0e0', padding: '16px'}}>
              <h4 style={{margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold'}}>
                🎞️ Series ({seriesList.length}개)
              </h4>
              {seriesList.map(series => (
                <div
                  key={series.orthanc_series_id}
                  onClick={() => fetchInstancesFromSeries(series)}
                  style={{
                    ...styles.seriesItem,
                    ...(selectedSeries?.orthanc_series_id === series.orthanc_series_id ? styles.seriesItemSelected : {})
                  }}
                >
                  <div style={{fontWeight: 'bold'}}>{series.series_description}</div>
                  <div style={{color: '#6b7280'}}>
                    #{series.series_number} | {series.instances_count} Images
                  </div>
                </div>
              ))}
            </div>
          )}

          {loadingImages && (
            <div style={{textAlign: 'center', padding: '20px', color: '#6b7280'}}>
              <RefreshCw className="animate-spin" size={16} />
              <div style={{fontSize: '12px'}}>Orthanc에서 데이터 로딩 중...</div>
            </div>
          )}
        </div>
      </div>

      {/* 메인 뷰어 영역 */}
      <div style={styles.mainArea}>
        <div style={styles.viewerArea}>
          {/* 도구 모음 */}
          <div style={styles.toolbar}>
            <button
              onClick={() => changeTool('pan')}
              style={{...styles.toolButton, ...(currentTool === 'pan' ? styles.toolButtonActive : {})}}
            >
              <Move size={16} /> Pan
            </button>
            <button
              onClick={() => changeTool('zoom')}
              style={{...styles.toolButton, ...(currentTool === 'zoom' ? styles.toolButtonActive : {})}}
            >
              <ZoomIn size={16} /> Zoom
            </button>
            <button
              onClick={() => changeTool('wwwc')}
              style={{...styles.toolButton, ...(currentTool === 'wwwc' ? styles.toolButtonActive : {})}}
            >
              <Activity size={16} /> W/L
            </button>
            <button
              onClick={() => changeTool('rectangle')}
              style={{...styles.toolButton, ...(currentTool === 'rectangle' ? styles.toolButtonActive : {})}}
            >
              <Square size={16} /> Annotation
            </button>
            <button onClick={saveAnnotations} style={styles.toolButton}>
              <Save size={16} /> Save Ann.
            </button>
            <button 
              onClick={() => {
                setAnnotations([]);
                drawAnnotationsOnCanvas();
              }} 
              style={styles.toolButton}
            >
              <Trash2 size={16} /> Clear
            </button>
            
            {/* 현재 이미지 정보 */}
            {currentImageElement && (
              <div style={{marginLeft: 'auto', color: 'white', fontSize: '12px'}}>
                Instance: {currentImageElement.instance_number} | 
                {selectedSeries && ` ${selectedSeries.series_description}`}
              </div>
            )}
          </div>

          {/* DICOM 뷰어 */}
          <div style={styles.viewerContainer}>
            {selectedStudy && selectedSeries ? (
              <>
                <canvas
                  ref={cornerstoneElement}
                  style={styles.dicomViewer}
                  width={512}
                  height={512}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                />
                
                {/* 이미지 네비게이션 */}
                {instancesList.length > 0 && (
                  <div style={styles.imageNavigation}>
                    <button 
                      onClick={() => navigateImage('prev')} 
                      style={styles.navButton}
                      disabled={currentImageIndex === 0}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span>{currentImageIndex + 1} / {instancesList.length}</span>
                    <button 
                      onClick={() => navigateImage('next')} 
                      style={styles.navButton}
                      disabled={currentImageIndex === instancesList.length - 1}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={{color: 'white', textAlign: 'center'}}>
                <Image size={64} />
                <div style={{marginTop: '16px', fontSize: '18px'}}>
                  {!selectedPatient ? '환자를 선택하세요' : 
                   !selectedStudy ? 'Study를 선택하세요' : 
                   'Series를 선택하세요'}
                </div>
                <div style={{marginTop: '8px', fontSize: '14px', color: '#888'}}>
                  {selectedPatient && `Patient ID: ${selectedPatient.patient_id}`}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 우측 어노테이션 & 리포트 패널 */}
        <div style={styles.reportPanel}>
          <div style={styles.reportHeader}>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <FileText size={20} color="#3b82f6" />
              <span style={{fontWeight: 'bold'}}>어노테이션 & 리포트</span>
            </div>
          </div>

          <div style={styles.reportContent}>
            {selectedPatient && (
              <>
                {/* 환자 정보 */}
                <div style={{marginBottom: '16px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '4px'}}>
                  <div style={{fontWeight: 'bold'}}>{selectedPatient.name}</div>
                  <div style={{fontSize: '12px', color: '#6b7280'}}>
                    Patient ID: <strong>{selectedPatient.patient_id}</strong>
                  </div>
                  <div style={{fontSize: '12px', color: '#6b7280'}}>
                    {selectedPatient.identifier} | {selectedPatient.birthdate} | {selectedPatient.gender === 'M' ? '남성' : '여성'}
                  </div>
                  {selectedStudy && (
                    <div style={{fontSize: '12px', color: '#6b7280', marginTop: '4px'}}>
                      📋 {selectedStudy.study_description} | {selectedStudy.study_date}
                    </div>
                  )}
                  {selectedSeries && (
                    <div style={{fontSize: '11px', color: '#9ca3af', marginTop: '2px'}}>
                      🎞️ {selectedSeries.series_description} | {selectedSeries.instances_count} Images
                    </div>
                  )}
                </div>

                {/* 어노테이션 목록 */}
                <div style={{marginBottom: '20px'}}>
                  <h4 style={{fontSize: '14px', fontWeight: 'bold', marginBottom: '8px'}}>
                    🎯 어노테이션 ({annotations.length}개)
                  </h4>
                  <div style={styles.annotationList}>
                    {annotations.length === 0 ? (
                      <div style={{padding: '20px', textAlign: 'center', color: '#6b7280'}}>
                        어노테이션이 없습니다
                      </div>
                    ) : (
                      annotations.map((annotation, index) => (
                        <div key={index} style={styles.annotationItem}>
                          <div style={{fontWeight: 'bold', color: '#dc2626'}}>{annotation.label}</div>
                          <div style={{color: '#6b7280'}}>
                            좌표: [{annotation.bbox.map(n => Math.round(n)).join(', ')}]
                          </div>
                          {annotation.dr_text && (
                            <div style={{marginTop: '4px', fontStyle: 'italic'}}>
                              {annotation.dr_text}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 리포트 상태 */}
                <div style={{marginBottom: '12px'}}>
                  <label style={{fontSize: '14px', fontWeight: 'bold', marginBottom: '4px', display: 'block'}}>
                    📄 리포트 상태
                  </label>
                  <select
                    value={reportStatus}
                    onChange={(e) => setReportStatus(e.target.value)}
                    style={styles.statusSelect}
                  >
                    <option value="draft">초안</option>
                    <option value="completed">완료</option>
                    <option value="approved">승인</option>
                  </select>
                </div>

                {/* 리포트 내용 */}
                <div style={{marginBottom: '16px'}}>
                  <label style={{fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', display: 'block'}}>
                    📝 판독 소견
                  </label>
                  <textarea
                    value={reportData}
                    onChange={(e) => setReportData(e.target.value)}
                    placeholder="판독 소견을 입력하세요..."
                    style={styles.reportTextarea}
                  />
                </div>

                {/* 저장 버튼들 */}
                <div>
                  <button onClick={saveAnnotations} style={styles.saveButton}>
                    <Save size={16} /> 어노테이션 저장
                  </button>
                  <button onClick={saveReport} style={styles.saveButton}>
                    <Save size={16} /> 리포트 저장
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DMViewer;