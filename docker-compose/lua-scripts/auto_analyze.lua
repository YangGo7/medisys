-- auto_analysis.lua
-- OnStoredInstance 함수는 새 인스턴스가 Orthanc에 저장될 때 호출됩니다.
function OnStoredInstance(instance_id, tags, metadata, origin)
    print("======================================")
    print("📥 새 DICOM 인스턴스 저장됨")
    print("📌 Instance ID (Orthanc 내부 ID): " .. instance_id)

    -- Fix: 'origin'이 nil이거나 'RequestOrigin'이 없을 경우를 처리
    local requestOrigin = "알 수 없음"
    if type(origin) == "table" and origin["RequestOrigin"] ~= nil then
        requestOrigin = tostring(origin["RequestOrigin"])
    end
    print("📌 Origin: " .. requestOrigin)

    -- StudyInstanceUID를 추출하기 위해 인스턴스 정보 조회
    -- RestApiGet은 Orthanc Lua에서 제공하는 내부 함수입니다.
    local instanceInfo = RestApiGet('/instances/' .. instance_id .. '/simplified-tags')
    local study_uid = instanceInfo["StudyInstanceUID"]


    
    -- 🧩 추가: Series에서 Study UID 추출 시도
    if study_uid == nil then
        local instanceMetadata = RestApiGet('/instances/' .. instance_id)
        local parentSeriesId = instanceMetadata["ParentSeries"]
        if parentSeriesId ~= nil then
            local seriesMetadata = RestApiGet('/series/' .. parentSeriesId)
            study_uid = seriesMetadata["MainDicomTags"]["StudyInstanceUID"]
            print("📍 Series에서 Study UID 보완 추출: " .. tostring(study_uid))
        end
    end



    if study_uid ~= nil then
        -- 🔥 중요: Nginx 프록시 경로와 Python AI 서비스의 /analyze-study/ 엔드포인트에 맞춤
        -- Orthanc 컨테이너에서 Nginx 컨테이너로 접근 (Docker Compose 네트워크 내 이름 사용)
        -- 'nginx'는 Docker Compose 파일에 정의된 Nginx 서비스 이름이라고 가정합니다.
        local aiServiceProxyBaseUrl = "http://nginx:80" -- Nginx 컨테이너의 내부 IP:포트 (외부 노출 포트 아님)

        -- Nginx의 location /ai-service/ 에 맞춰 경로 접두사 포함
        local aiServiceUrl = aiServiceProxyBaseUrl .. "/ai-service/analyze-study/" .. study_uid
        print("🚀 AI 분석 요청 시작 (Study): " .. aiServiceUrl)

        -- 비동기 POST 요청
        pcall(function()
            local response = HttpPost(aiServiceUrl, "{}", {
                ["Content-Type"] = "application/json",
                timeout = 60  -- 60초 타임아웃
            })

            if response ~= nil then
                print("✅ AI 분석 요청 성공 - Study UID: " .. study_uid)
                print("📨 응답 내용: " .. tostring(response))
            else
                print("❌ AI 분석 요청 실패 (응답 없음) - Study UID: " .. study_uid)
            end
        end)
        print("📤 AI 분석 요청 전송 완료 (비동기, Study)")
    else
        print("❌ StudyInstanceUID를 찾을 수 없어 AI 분석 요청 스킵 - Instance ID: " .. instance_id)
    end

    print("======================================")
end

function Initialize()
    print("🔵 Orthanc AI 자동 분석 스크립트 시작됨")
end

function Finalize()
    print("🛑 Orthanc AI 자동 분석 스크립트 종료됨")
end