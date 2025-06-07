window.config = {
  routerBasename: '/',
  showStudyList: true,
  
  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomjson',
      sourceName: 'dicomjson',
      configuration: {
        friendlyName: 'Orthanc REST API',
        name: 'orthanc',
        
        // Orthanc 기본 REST API 사용
        orthancApiRoot: '/orthanc',
        
        requestOptions: {
          requestCredentials: 'omit'
        }
      }
    }
  ],
  
  defaultDataSourceName: 'dicomjson'
};
