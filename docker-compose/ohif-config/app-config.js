window.config = {
  routerBasename: '/',
  
  extensions: [
    '@ohif/extension-default',
    '@ohif/extension-cornerstone',
    '@ohif/extension-cornerstone-dicom-sr',
    '@ohif/extension-cornerstone-dicom-seg',
    '@ohif/extension-cornerstone-dicom-rt',
    '@ohif/extension-dicom-pdf',
    '@ohif/extension-dicom-video'
  ],

  modes: [
    '@ohif/mode-basic-viewer',
    '@ohif/mode-longitudinal'
  ],

  defaultMode: '@ohif/mode-basic-viewer',
  showStudyList: true,
  maxNumberOfWebWorkers: 3,
  omitQuotationForMultipartRequest: true,
  
  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
      sourceName: 'dicomweb',
      configuration: {
        friendlyName: 'Medical Platform Orthanc',
        name: 'orthanc',
        
        wadoUriRoot: 'http://35.225.63.41:8042/wado',
        qidoRoot: 'http://35.225.63.41:8042/dicom-web',
        wadoRoot: 'http://35.225.63.41:8042/dicom-web',
        
        qidoSupportsIncludeField: false,
        supportsReject: false,
        imageRendering: 'wadors',
        thumbnailRendering: 'wadors',
        enableStudyLazyLoad: true,
        supportsFuzzyMatching: false,
        supportsWildcard: true,
        staticWado: true,
        singlepart: 'bulkdata,video',
        
        requestOptions: {
          requestCredentials: 'omit',
          auth: 'b3J0aGFuYzpvcnRoYW5j',
          headers: {
            'Authorization': 'Basic b3J0aGFuYzpvcnRoYW5j',
            'Accept': 'application/dicom+json, application/json, */*',
            'Content-Type': 'application/dicom+json'
          }
        },
        
        acceptHeader: 'application/dicom+json',
        omitQuotationForMultipartRequest: true,
        enableStudyLazyLoad: true,
        filterImageInstances: false,
        
        bulkDataURI: {
          enabled: true,
          relativeResolution: 'studies'
        }
      }
    }
  ],

  defaultDataSourceName: 'dicomweb',

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
    },
    {
      commandName: 'rotateViewportCW',
      label: 'Rotate Right',
      keys: ['r']
    },
    {
      commandName: 'rotateViewportCCW',
      label: 'Rotate Left',
      keys: ['l']
    },
    {
      commandName: 'invertViewport',
      label: 'Invert',
      keys: ['i']
    },
    {
      commandName: 'flipViewportVertical',
      label: 'Flip Vertically',
      keys: ['v']
    },
    {
      commandName: 'flipViewportHorizontal',
      label: 'Flip Horizontally',
      keys: ['h']
    },
    {
      commandName: 'scaleUpViewport',
      label: 'Zoom In',
      keys: ['=']
    },
    {
      commandName: 'scaleDownViewport',
      label: 'Zoom Out',
      keys: ['-']
    },
    {
      commandName: 'fitViewportToWindow',
      label: 'Zoom to Fit',
      keys: ['0']
    },
    {
      commandName: 'resetViewport',
      label: 'Reset',
      keys: ['space']
    }
  ],

  cornerstoneExtensionConfig: {
    maxWebWorkers: 3,
    tools: {
      brush: {
        activeStrategy: 'FILL_INSIDE'
      }
    }
  },

  investigationalUseDialog: {
    option: 'never'
  },

  whiteLabeling: {
    createLogoComponentFn: function(React) {
      return React.createElement('div', {
        style: {
          color: '#fff',
          fontSize: '18px',
          fontWeight: 'bold',
          padding: '10px',
          cursor: 'pointer'
        },
        onClick: function() {
          window.open('http://35.225.63.41:8042/app/explorer.html', '_blank');
        }
      }, '🏥 Medical Platform OHIF');
    }
  },

  httpErrorHandler: function(error) {
    console.error('OHIF HTTP Error:', error);
    
    if (error.message.includes('Failed to fetch') || error.status === 0) {
      console.error('❌ Orthanc 서버 연결 실패. 다음을 확인하세요:');
      console.error('1. Orthanc 서버가 실행 중인지 확인: http://35.225.63.41:8042');
      console.error('2. DICOMweb 플러그인이 활성화되어 있는지 확인');
      console.error('3. CORS 설정이 올바른지 확인');
    }
  },

  experimental: {
    studyBrowserSort: true,
    enabledSUVScaling: true
  },

  oidc: [],
  
  googleAnalytics: {
    trackingId: '',
    anonymizeIp: true
  },

  debug: {
    verbose: true,
    timing: true
  }
};
