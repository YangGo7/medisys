#!/bin/bash
# OHIF 컨테이너 내부에 올바른 설정 주입

echo "🔧 OHIF 설정 수정 중..."

# OHIF 컨테이너가 실행되면 설정 파일 교체
docker exec ohif-viewer sh -c 'cat > /usr/share/nginx/html/app-config.js << "EOL"
window.config = {
  routerBasename: "/",
  
  extensions: [
    "@ohif/extension-default",
    "@ohif/extension-cornerstone",
    "@ohif/extension-cornerstone-dicom-sr",
    "@ohif/extension-cornerstone-dicom-seg",
    "@ohif/extension-cornerstone-dicom-rt",
    "@ohif/extension-dicom-pdf",
    "@ohif/extension-dicom-video"
  ],

  modes: [
    "@ohif/mode-basic-viewer",
    "@ohif/mode-longitudinal"
  ],

  defaultMode: "@ohif/mode-basic-viewer",
  showStudyList: true,
  maxNumberOfWebWorkers: 3,
  omitQuotationForMultipartRequest: true,
  
  dataSources: [
    {
      namespace: "@ohif/extension-default.dataSourcesModule.dicomweb",
      sourceName: "dicomweb",
      configuration: {
        friendlyName: "Medical Platform Orthanc",
        name: "orthanc",
        
        wadoUriRoot: "http://35.225.63.41:8042/wado",
        qidoRoot: "http://35.225.63.41:8042/dicom-web",
        wadoRoot: "http://35.225.63.41:8042/dicom-web",
        
        qidoSupportsIncludeField: false,
        supportsReject: false,
        imageRendering: "wadors",
        thumbnailRendering: "wadors",
        enableStudyLazyLoad: true,
        supportsFuzzyMatching: false,
        supportsWildcard: true,
        staticWado: true,
        singlepart: "bulkdata,video",
        
        requestOptions: {
          requestCredentials: "omit",
          auth: "b3J0aGFuYzpvcnRoYW5j",
          headers: {
            "Authorization": "Basic b3J0aGFuYzpvcnRoYW5j",
            "Accept": "application/dicom+json, application/json, */*",
            "Content-Type": "application/dicom+json"
          }
        },
        
        acceptHeader: "application/dicom+json",
        omitQuotationForMultipartRequest: true,
        enableStudyLazyLoad: true,
        filterImageInstances: false,
        
        bulkDataURI: {
          enabled: true,
          relativeResolution: "studies"
        }
      }
    }
  ],

  defaultDataSourceName: "dicomweb",

  investigationalUseDialog: {
    option: "never"
  },

  whiteLabeling: {
    createLogoComponentFn: function(React) {
      return React.createElement("div", {
        style: {
          color: "#fff",
          fontSize: "18px",
          fontWeight: "bold",
          padding: "10px",
          cursor: "pointer"
        },
        onClick: function() {
          window.open("http://35.225.63.41:8042/app/explorer.html", "_blank");
        }
      }, "🏥 Medical Platform OHIF");
    }
  },

  httpErrorHandler: function(error) {
    console.error("OHIF HTTP Error:", error);
    
    if (error.message.includes("Failed to fetch") || error.status === 0) {
      console.error("❌ Orthanc 서버 연결 실패");
    }
  }
};
EOL'

# NGINX 재시작으로 설정 적용
docker exec ohif-viewer nginx -s reload

echo "✅ OHIF 설정 수정 완료"
