// docker-compose/ohif-config/app-config.js
window.config = {
  routerBasename: '/',
  
  // 확장 프로그램 설정
  extensions: [
    '@ohif/extension-default',
    '@ohif/extension-cornerstone',
    '@ohif/extension-cornerstone-dicom-sr',
    '@ohif/extension-cornerstone-dicom-seg',
    '@ohif/extension-cornerstone-dicom-rt',
    '@ohif/extension-dicom-pdf',
    '@ohif/extension-dicom-video'
  ],
  
  // 모드 설정
  modes: [
    '@ohif/mode-basic-viewer',
    '@ohif/mode-longitudinal'
  ],
  
  // 기본 모드
  defaultMode: '@ohif/mode-basic-viewer',
  
  // Study List 표시
  showStudyList: true,
  
  // 핫키 설정
  hotkeys: [
    {
      commandName: 'incrementActiveViewport',
      label: 'Next Viewport',
      keys: ['right']
    },
    {
      commandName: 'decrementActiveViewport', 
      label: 'Previous Viewport',
      keys: ['left']
    }
  ],
  
  // 데이터 소스 설정 (Orthanc DICOMweb)
  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
      sourceName: 'dicomweb',
      configuration: {
        friendlyName: 'Medical Platform Orthanc',
        name: 'orthanc',
        
        // WADO-URI 엔드포인트
        wadoUriRoot: 'http://35.225.63.41:8042/wado',
        
        // QIDO-RS 엔드포인트 (Study/Series 검색용)
        qidoRoot: 'http://35.225.63.41:8042/dicom-web',
        
        // WADO-RS 엔드포인트 (Instance 조회용)
        wadoRoot: 'http://35.225.63.41:8042/dicom-web',
        
        // Orthanc 특화 설정
        qidoSupportsIncludeField: false,
        supportsReject: false,
        imageRendering: 'wadors',
        thumbnailRendering: 'wadors',
        enableStudyLazyLoad: true,
        supportsFuzzyMatching: false,
        supportsWildcard: true,
        staticWado: true,
        singlepart: 'bulkdata,video',
        
        // 요청 옵션
        requestOptions: {
          requestCredentials: 'omit',
          // Basic Auth for Orthanc
          auth: 'b3J0aGFuYzpvcnRoYW5j', // base64('orthanc:orthanc')
          headers: {
            'Authorization': 'Basic b3J0aGFuYzpvcnRoYW5j'
          }
        },
        
        // Orthanc DICOMweb 플러그인 호환성
        omitQuotationForMultipartRequest: true,
        
        // URL 구성
        wadoUriRoot: 'http://35.225.63.41:8042/wado',
        qidoRoot: 'http://35.225.63.41:8042/dicom-web',
        wadoRoot: 'http://35.225.63.41:8042/dicom-web'
      }
    }
  ],
  
  // 기본 데이터 소스
  defaultDataSourceName: 'dicomweb',
  
  // UI 설정
  investigationalUseDialog: {
    option: 'never'
  },
  
  // 로고 및 브랜딩
  whiteLabeling: {
    createLogoComponentFn: function(React) {
      return React.createElement('div', {
        style: {
          color: '#fff',
          fontSize: '18px',
          fontWeight: 'bold',
          padding: '10px'
        }
      }, 'Medical Platform OHIF');
    }
  },
  
  // 고급 설정
  httpErrorHandler: error => {
    console.error('OHIF HTTP Error:', error);
  },
  
  // Cornerstone 설정
  cornerstoneExtensionConfig: {
    tools: {
      // 기본 도구들
      brush: {
        activeStrategy: 'FILL_INSIDE'
      }
    }
  },
  
  // 서버 설정
  oidc: [],
  
  // 실험적 기능들
  experimental: {
    studyBrowserSort: true
  }
};