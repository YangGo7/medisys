window.config = {
  routerBasename: '/',
  extensions: [],
  modes: [],
  showStudyList: true,
  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
      sourceName: 'dicomweb',
      configuration: {
        friendlyName: 'Orthanc DICOMweb',
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
          auth: 'Basic b3J0aGFuYzpvcnRoYW5j'
        }
      }
    }
  ],
  defaultDataSourceName: 'dicomweb'
};
