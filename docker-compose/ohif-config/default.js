// 상묵님이 해준거
// window.config = {
//   routerBasename: '/',
//   extensions: [  ],
  
//   modes: [],
//   showStudyList: true,
//   dataSources: [
//     {
//       namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
//       sourceName: 'dicomweb',
//       configuration: {
//         friendlyName: 'Local Orthanc Server',
//         name: 'orthanc',
//         wadoUriRoot: 'http://localhost:8042/wado',
//         qidoRoot: 'http://localhost:8042/dicom-web',
//         wadoRoot: 'http://localhost:8042/dicom-web',
//         qidoSupportsIncludeField: false,
//         supportsReject: false,
//         imageRendering: 'wadors',
//         thumbnailRendering: 'wadors',
//         enableStudyLazyLoad: true,
//         supportsFuzzyMatching: false,
//         supportsWildcard: true,
//         staticWado: true,
//         singlepart: 'bulkdata,video',
//         requestOptions: {
//           requestCredentials: 'omit',
//         }
//       }
//     }
//   ],
//   defaultDataSourceName: 'dicomweb'

// };


window.config = {
  routerBasename: '/',
  extensions: [
    '@ohif/extension-default', // 추가
    '@ohif/extension-cornerstone', // 추가
    'custom-studylist-extension'  // 커스텀 확장 추가
  ],

  modes: [],
  showStudyList: true,
  dataSources: [
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
      sourceName: 'dicomweb',
      configuration: {
        friendlyName: 'Local Orthanc Server',
        name: 'orthanc',
        wadoUriRoot: 'http://localhost:8042/wado',
        qidoRoot: 'http://localhost:8042/dicom-web',
        wadoRoot: 'http://localhost:8042/dicom-web',
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
        }
      }
    }
  ],
  defaultDataSourceName: 'dicomweb'

};
