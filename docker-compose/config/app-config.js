// configs/ohif-config.js
// 프로젝트 환경에 맞춘 OHIF 설정

window.config = {
  routerBasename: '/',
  
  // ✅ 프로젝트 Orthanc 서버 연동
  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
      sourceName: 'dicomweb',
      configuration: {
        friendlyName: 'CDSS Orthanc PACS',
        name: 'orthanc',
        
        // ✅ 실제 프로젝트 Orthanc 주소
        wadoUriRoot: 'http://35.225.63.41:8042/wado',
        qidoRoot: 'http://35.225.63.41:8042/dicom-web',
        wadoRoot: 'http://35.225.63.41:8042/dicom-web',
        
        // Orthanc 호환성 설정
        qidoSupportsIncludeField: false,
        imageRendering: 'wadors',
        thumbnailRendering: 'wadors',
        enableStudyLazyLoad: true,
        supportsFuzzyMatching: false,
        supportsWildcard: false,
        omitQuotationForMultipartRequest: true,
        
        // 인증 설정 (Orthanc 기본 인증 있다면)
        requestOptions: {
          auth: undefined, // 필요시 'orthanc:orthanc' 형태로
        },
      },
    },
  ],
  
  defaultDataSourceName: 'dicomweb',
  
  // ✅ UI 최적화 (CDSS 환경에 맞춤)
  showStudyList: false,
  studyListFunctionsEnabled: false,
  
  // 경고 대화상자 비활성화
  investigationalUseDialog: {
    option: 'never'
  },
  
  // ✅ 의료진 사용에 필요한 확장만 선택
  extensions: [
    '@ohif/extension-default',
    '@ohif/extension-cornerstone',
    '@ohif/extension-measurement-tracking',
    '@ohif/extension-cornerstone-dicom-sr',
  ],
  
  modes: [
    '@ohif/mode-longitudinal',
  ],
  
  defaultMode: '@ohif/mode-longitudinal',
  
  // ✅ CDSS 브랜딩
  whiteLabeling: {
    createLogoComponentFn: function (React) {
      return React.createElement(
        'div',
        {
          style: {
            color: '#fff',
            fontSize: '18px',
            fontWeight: 'bold',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer'
          },
          onClick: function() {
            // CDSS 메인으로 이동 (선택사항)
            window.parent.postMessage('navigate-to-main', '*');
          }
        },
        [
          React.createElement('span', { key: 'icon' }, '🏥'),
          React.createElement('span', { key: 'text' }, 'CDSS Medical Platform')
        ]
      );
    },
  },
  
  // ✅ 성능 최적화
  maxNumberOfWebWorkers: 4,
  maxNumRequests: {
    interaction: 100,
    thumbnail: 75,
    prefetch: 25,
  },
  
  // ✅ 의료진 워크플로우에 맞춘 핫키
  hotkeys: [
    {
      commandName: 'incrementActiveViewport',
      label: 'Next Viewport',
      keys: ['right'],
    },
    {
      commandName: 'decrementActiveViewport', 
      label: 'Previous Viewport',
      keys: ['left'],
    },
    {
      commandName: 'setToolActive',
      commandOptions: { toolName: 'Zoom' },
      label: 'Zoom',
      keys: ['z'],
    },
    {
      commandName: 'setToolActive',
      commandOptions: { toolName: 'WindowLevel' },
      label: 'Window/Level',
      keys: ['w'],
    },
  ],
  
  // ✅ 추가 설정
  showLoadingIndicator: true,
  enableGoogleCloudAdapter: false,
  
  // 오류 처리
  showErrorDialog: false,
  strictZSpacingForVolumeViewport: false,
};