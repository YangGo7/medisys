import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Save, 
  X, 
  FileText, 
  Image, 
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  Stethoscope,
  Brain,
  ClipboardList,
  Activity
} from 'lucide-react';

const DiagnosisPrescriptionPanel = ({ 
  patient, // 🔥 patient 객체로 변경 (기존 patientUuid, encounterUuid, doctorUuid 대신)
  onSaveSuccess, // 🔥 저장 성공 콜백 (onSave에서 변경)
  initialData = null 
}) => {
  const API_BASE = '';
  const [activeTab, setActiveTab] = useState('S');
  const [soapData, setSoapData] = useState({
    S: [], // Subjective
    O: [], // Objective  
    A: [], // Assessment
    P: []  // Plan
  });
  
  // 🔥 환자 정보 추출
  const patientUuid = patient?.person?.uuid || patient?.uuid || patient?.openmrs_patient_uuid;
  const patientName = patient?.name || patient?.display || patient?.patient_name;
  const doctorUuid = 'admin'; // 실제로는 로그인한 의사 UUID

  // currentEntry를 activeTab에 따라 초기화하되, 불필요한 렌더링 방지
  const getInitialEntry = useCallback((soapType) => ({
    soap_type: soapType,
    content: '',
    clinical_notes: '',
    icd10_code: '',
    icd10_name: '',
    diagnosis_type: 'PRIMARY',
    image_files: []
  }), []);

  const [currentEntry, setCurrentEntry] = useState(() => getInitialEntry('S'));
  const [icd10Results, setIcd10Results] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showIcd10Search, setShowIcd10Search] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState(null);

  // activeTab 변경 시 currentEntry 초기화 (메모이제이션으로 최적화)
  useEffect(() => {
    setCurrentEntry(getInitialEntry(activeTab));
    setShowIcd10Search(false);
    setIcd10Results([]);
  }, [activeTab, getInitialEntry]);

  // 디바운스된 ICD-10 검색
  const searchIcd10 = useCallback(async (query) => {
    if (query.length < 2) {
      setIcd10Results([]);
      setShowIcd10Search(false);
      return;
    }
    
    // 이전 타임아웃 클리어
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // 새 타임아웃 설정 (500ms 디바운스)
    const newTimeout = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/openmrs/icd10-search/?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        setIcd10Results(data.results || []);
        setShowIcd10Search(true);
      } catch (error) {
        console.error('ICD-10 검색 실패:', error);
        setIcd10Results([]);
        setShowIcd10Search(false);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    setSearchTimeout(newTimeout);
  }, [searchTimeout]);

  // 컴포넌트 언마운트 시 타임아웃 정리
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // SOAP 엔트리 추가 (최적화)
  const addSoapEntry = useCallback(() => {
    if (!currentEntry.content.trim()) {
      alert('내용을 입력해주세요.');
      return;
    }

    const newEntry = {
      ...currentEntry,
      uuid: `temp-${Date.now()}`,
      sequence_number: soapData[activeTab].length + 1,
      created_date: new Date().toISOString()
    };

    setSoapData(prev => ({
      ...prev,
      [activeTab]: [...prev[activeTab], newEntry]
    }));

    // 입력 폼 초기화
    setCurrentEntry(getInitialEntry(activeTab));
    setShowIcd10Search(false);
    setIcd10Results([]);
  }, [currentEntry, soapData, activeTab, getInitialEntry]);

  // SOAP 엔트리 삭제 (최적화)
  const removeSoapEntry = useCallback((soapType, index) => {
    setSoapData(prev => ({
      ...prev,
      [soapType]: prev[soapType].filter((_, i) => i !== index)
    }));
  }, []);

  // 🔥 핵심: Encounter 생성 + SOAP 진단 저장 (통합 버전)
  const handleSave = useCallback(async () => {
    if (!patientUuid) {
      alert('환자 정보가 없습니다.');
      return;
    }

    // 모든 SOAP 데이터 수집
    const allEntries = [];
    Object.keys(soapData).forEach(soapType => {
      soapData[soapType].forEach(entry => {
        allEntries.push({
          soap_type: soapType,
          content: entry.content,
          clinical_notes: entry.clinical_notes || '',
          icd10_code: entry.icd10_code || '',
          icd10_name: entry.icd10_name || '',
          diagnosis_type: entry.diagnosis_type || 'PRIMARY',
          sequence_number: entry.sequence_number || 1
        });
      });
    });

    if (allEntries.length === 0) {
      alert('저장할 진단 정보가 없습니다.');
      return;
    }

    // 🔥 새로운 데이터 구조: Encounter + SOAP 진단들
    const requestData = {
      patient_uuid: patientUuid,
      doctor_uuid: doctorUuid,
      soap_diagnoses: allEntries
    };

    console.log('📝 저장할 데이터:', requestData);

    setIsSaving(true);
    try {
      const response = await fetch(`/api/openmrs/soap-diagnoses/bulk_create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestData)
      });
      console.log('📡 호출 URL:', `/api/openmrs/soap-diagnoses/bulk_create/`);
      console.log('응답 상태:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('응답 에러:', errorText);
        
        if (errorText.includes('<!DOCTYPE')) {
          throw new Error(`서버 에러 (${response.status}): API 엔드포인트를 찾을 수 없습니다.`);
        }
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || `서버 에러 (${response.status})`);
        } catch (parseError) {
          throw new Error(`서버 에러 (${response.status}): ${errorText}`);
        }
      }

      const result = await response.json();
      console.log('저장 성공:', result);

      if (result.status === 'success') {
        // 🔥 성공 메시지에 Encounter 정보 포함
        alert(`저장 완료!\n- Encounter UUID: ${result.encounter_uuid}\n- SOAP 진단: ${result.summary.created_count}개 저장`);
        
        // 에러가 있다면 표시
        if (result.summary.error_count > 0) {
          console.warn('일부 항목 저장 실패:', result.errors);
          alert(`주의: ${result.summary.error_count}개 항목 저장 실패`);
        }
        
        // 성공 시 폼 초기화
        setSoapData({S: [], O: [], A: [], P: []});
        setCurrentEntry(getInitialEntry(activeTab));
        
        // 🔥 콜백 호출 (내원이력 새로고침용)
        if (onSaveSuccess) {
          onSaveSuccess({
            encounter_uuid: result.encounter_uuid,
            created_count: result.summary.created_count,
            patient_uuid: patientUuid
          });
        }
        
      } else {
        throw new Error(result.message || '저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('저장 실패:', error);
      alert(`저장 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }, [soapData, patientUuid, doctorUuid, onSaveSuccess, getInitialEntry, activeTab]);

  // ICD-10 선택 (최적화)
  const selectIcd10 = useCallback((icd10) => {
    setCurrentEntry(prev => ({
      ...prev,
      icd10_code: icd10.code,
      icd10_name: icd10.name,
      content: prev.content || icd10.name // 🔥 진단명도 content에 자동 입력
    }));
    setShowIcd10Search(false);
    setIcd10Results([]);
  }, []);

  // 입력 핸들러들 (최적화)
  const handleContentChange = useCallback((value) => {
    setCurrentEntry(prev => ({...prev, content: value}));
  }, []);

  const handleNotesChange = useCallback((value) => {
    setCurrentEntry(prev => ({...prev, clinical_notes: value}));
  }, []);

  const handleDiagnosisTypeChange = useCallback((value) => {
    setCurrentEntry(prev => ({...prev, diagnosis_type: value}));
  }, []);

  const handleIcd10CodeChange = useCallback((value) => {
    setCurrentEntry(prev => ({...prev, icd10_code: value}));
    searchIcd10(value);
  }, [searchIcd10]);

  // SOAP 탭 아이콘 및 라벨 (메모이제이션)
  const soapTabs = useMemo(() => [
    { key: 'S', label: 'Subjective', icon: User, color: 'blue', desc: '주관적 정보' },
    { key: 'O', label: 'Objective', icon: Activity, color: 'green', desc: '객관적 소견' },
    { key: 'A', label: 'Assessment', icon: Brain, color: 'orange', desc: '평가/진단' },
    { key: 'P', label: 'Plan', icon: ClipboardList, color: 'purple', desc: '치료계획' }
  ], []);

  // 진단 타입 옵션 (메모이제이션)
  const diagnosisTypes = useMemo(() => [
    { value: 'PRIMARY', label: '주진단' },
    { value: 'SECONDARY', label: '부진단' },
    { value: 'PROVISIONAL', label: '잠정진단' },
    { value: 'DIFFERENTIAL', label: '감별진단' }
  ], []);

  // 현재 탭 정보 계산 (메모이제이션)
  const currentTabInfo = useMemo(() => 
    soapTabs.find(tab => tab.key === activeTab), 
    [soapTabs, activeTab]
  );

  // 저장 가능 여부 계산 (메모이제이션)
  const canSave = useMemo(() => 
    Object.values(soapData).some(entries => entries.length > 0),
    [soapData]
  );

  // 탭 클릭 핸들러 (최적화)
  const handleTabClick = useCallback((tabKey) => {
    if (tabKey !== activeTab) {
      setActiveTab(tabKey);
    }
  }, [activeTab]);

  // 🔥 환자 정보가 없는 경우
  if (!patient || !patientUuid) {
    return (
      <div className="diagnosis-prescription-panel">
        <style jsx>{`
          .diagnosis-prescription-panel {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
            padding: 2rem;
            text-align: center;
          }
          .error-message {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            color: #dc2626;
            font-weight: 500;
          }
        `}</style>
        <div className="error-message">
          <AlertCircle size={20} />
          환자가 선택되지 않았습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="diagnosis-prescription-panel">
      <style jsx>{`
        .diagnosis-prescription-panel {
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .panel-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 1.5rem;
          position: relative;
        }

        .panel-title {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .panel-subtitle {
          opacity: 0.9;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .patient-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 6px;
        }

        .soap-tabs {
          display: flex;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .soap-tab {
          flex: 1;
          padding: 1rem;
          text-align: center;
          background: none;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          border-bottom: 3px solid transparent;
          position: relative;
        }

        .soap-tab:hover {
          background: #f1f5f9;
        }

        .soap-tab.active {
          background: white;
          border-bottom-color: var(--tab-color);
        }

        .soap-tab.active.blue { --tab-color: #3b82f6; }
        .soap-tab.active.green { --tab-color: #10b981; }
        .soap-tab.active.orange { --tab-color: #f59e0b; }
        .soap-tab.active.purple { --tab-color: #8b5cf6; }

        .tab-content {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          justify-content: center;
        }

        .tab-label {
          font-weight: 600;
          font-size: 0.9rem;
        }

        .tab-desc {
          font-size: 0.75rem;
          color: #64748b;
        }

        .tab-badge {
          background: #dc2626;
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
        }

        .panel-content {
          padding: 1.5rem;
        }

        .entry-form {
          background: #f8fafc;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          border: 2px dashed #cbd5e1;
        }

        .form-row {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .form-group {
          flex: 1;
        }

        .form-label {
          display: block;
          font-weight: 500;
          margin-bottom: 0.5rem;
          color: #374151;
          font-size: 0.9rem;
        }

        .form-input, .form-textarea, .form-select {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.9rem;
          transition: border-color 0.2s;
        }

        .form-input:focus, .form-textarea:focus, .form-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-textarea {
          resize: vertical;
          min-height: 80px;
        }

        .icd10-search {
          position: relative;
        }

        .icd10-input {
          padding-right: 2.5rem;
        }

        .search-button {
          position: absolute;
          right: 0.5rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 0.25rem;
        }

        .icd10-results {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          max-height: 200px;
          overflow-y: auto;
          z-index: 10;
        }

        .icd10-item {
          padding: 0.75rem;
          cursor: pointer;
          border-bottom: 1px solid #f3f4f6;
          transition: background-color 0.2s;
        }

        .icd10-item:hover {
          background: #f3f4f6;
        }

        .icd10-code {
          font-weight: 600;
          color: #1f2937;
        }

        .icd10-name {
          font-size: 0.85rem;
          color: #6b7280;
          margin-top: 0.25rem;
        }

        .action-buttons {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
          border: none;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-success {
          background: #10b981;
          color: white;
          border: none;
        }

        .btn-success:hover:not(:disabled) {
          background: #059669;
        }

        .btn-secondary {
          background: #6b7280;
          color: white;
          border: none;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #4b5563;
        }

        .soap-entries {
          space-y: 1rem;
        }

        .soap-entry {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1rem;
          position: relative;
          transition: all 0.2s;
          margin-bottom: 1rem;
        }

        .soap-entry:hover {
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .entry-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .entry-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.8rem;
          color: #6b7280;
        }

        .delete-button {
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 0.25rem;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .delete-button:hover {
          background: #b91c1c;
        }

        .entry-content {
          margin-bottom: 0.5rem;
        }

        .entry-text {
          line-height: 1.5;
          color: #374151;
        }

        .icd10-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          background: #dbeafe;
          color: #1e40af;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 500;
          margin-top: 0.5rem;
        }

        .loading-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid #f3f4f6;
          border-radius: 50%;
          border-top-color: #3b82f6;
          animation: spin 1s ease-in-out infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-state {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }

        .empty-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 1rem;
          color: #d1d5db;
        }

        .save-section {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e5e7eb;
          text-align: center;
        }

        .btn-large {
          padding: 1rem 2rem;
          font-size: 1rem;
        }
      `}</style>

      {/* 헤더 */}
      <div className="panel-header">
        <div className="panel-title">
          <Stethoscope size={24} />
          SOAP 진단 기록
        </div>
        <div className="panel-subtitle">
          체계적인 진단 정보 작성 및 관리
        </div>
        <div className="patient-info">
          <User size={16} />
          <span>
            {patientName} 
            <small> ({patientUuid.slice(0, 8)}...)</small>
          </span>
        </div>
      </div>

      {/* SOAP 탭 */}
      <div className="soap-tabs">
        {soapTabs.map(tab => {
          const IconComponent = tab.icon;
          const count = soapData[tab.key].length;
          
          return (
            <button
              key={tab.key}
              className={`soap-tab ${activeTab === tab.key ? 'active' : ''} ${tab.color}`}
              onClick={() => handleTabClick(tab.key)}
              type="button"
            >
              <div className="tab-content">
                <IconComponent size={18} />
                <div>
                  <div className="tab-label">{tab.label}</div>
                  <div className="tab-desc">{tab.desc}</div>
                </div>
              </div>
              {count > 0 && <span className="tab-badge">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* 컨텐츠 */}
      <div className="panel-content">
        {/* 입력 폼 */}
        <div className="entry-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                {activeTab === 'S' && '환자가 호소하는 증상'}
                {activeTab === 'O' && '객관적 관찰 소견'}
                {activeTab === 'A' && '진단 및 평가'}
                {activeTab === 'P' && '치료 계획'}
              </label>
              <textarea
                className="form-textarea"
                value={currentEntry.content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder={
                  activeTab === 'S' ? '환자가 설명하는 증상, 불편감, 병력 등을 기록하세요...' :
                  activeTab === 'O' ? '진찰 소견, 검사 결과, 바이탈 사인 등을 기록하세요...' :
                  activeTab === 'A' ? '진단명, 병태 평가, 예후 등을 기록하세요...' :
                  '치료 방법, 처방, 추적 관찰 계획 등을 기록하세요...'
                }
              />
            </div>
          </div>

          {/* Assessment 전용 필드들 */}
          {activeTab === 'A' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">ICD-10 코드 검색</label>
                  <div className="icd10-search">
                    <input
                      type="text"
                      className="form-input icd10-input"
                      value={currentEntry.icd10_code}
                      onChange={(e) => handleIcd10CodeChange(e.target.value)}
                      placeholder="ICD-10 코드 또는 진단명 검색..."
                    />
                    <button className="search-button">
                      {isSearching ? <div className="loading-spinner" /> : <Search size={16} />}
                    </button>
                    
                    {showIcd10Search && icd10Results.length > 0 && (
                      <div className="icd10-results">
                        {icd10Results.map((item, index) => (
                          <div
                            key={index}
                            className="icd10-item"
                            onClick={() => selectIcd10(item)}
                          >
                            <div className="icd10-code">{item.code}</div>
                            <div className="icd10-name">{item.name}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">진단 분류</label>
                  <select
                    className="form-select"
                    value={currentEntry.diagnosis_type}
                    onChange={(e) => handleDiagnosisTypeChange(e.target.value)}
                  >
                    {diagnosisTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {currentEntry.icd10_name && (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">선택된 진단</label>
                    <div className="icd10-badge">
                      <FileText size={14} />
                      {currentEntry.icd10_code} - {currentEntry.icd10_name}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">추가 임상 메모</label>
              <textarea
                className="form-textarea"
                value={currentEntry.clinical_notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="추가적인 임상 소견이나 특이사항을 기록하세요..."
                rows={3}
              />
            </div>
          </div>

          <div className="action-buttons">
            <button className="btn btn-primary" onClick={addSoapEntry} type="button">
              <Plus size={16} />
              추가
            </button>
          </div>
        </div>

        {/* 저장된 SOAP 엔트리들 */}
        <div className="soap-entries">
          {soapData[activeTab].length === 0 ? (
            <div className="empty-state">
              <FileText className="empty-icon" />
              <p>아직 {currentTabInfo?.desc} 정보가 없습니다.</p>
              <p>위 양식을 작성하여 정보를 추가해보세요.</p>
            </div>
          ) : (
            soapData[activeTab].map((entry, index) => (
              <div key={entry.uuid || index} className="soap-entry">
                <div className="entry-header">
                  <div className="entry-meta">
                    <span>#{entry.sequence_number}</span>
                    <span>{new Date(entry.created_date).toLocaleString()}</span>
                    {entry.diagnosis_type && (
                      <span>{diagnosisTypes.find(t => t.value === entry.diagnosis_type)?.label}</span>
                    )}
                  </div>
                  <button
                    className="delete-button"
                    onClick={() => removeSoapEntry(activeTab, index)}
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="entry-content">
                  <div className="entry-text">{entry.content}</div>
                  {entry.clinical_notes && (
                    <div className="entry-text" style={{marginTop: '0.5rem', fontStyle: 'italic', color: '#6b7280'}}>
                      메모: {entry.clinical_notes}
                    </div>
                  )}
                  {entry.icd10_code && entry.icd10_name && (
                    <div className="icd10-badge">
                      <FileText size={14} />
                      {entry.icd10_code} - {entry.icd10_name}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 🔥 전체 저장 버튼 - Encounter + SOAP 진단 저장 */}
        {canSave && (
          <div className="save-section">
            <button
              className="btn btn-success btn-large"
              onClick={handleSave}
              disabled={isSaving}
              type="button"
            >
              {isSaving ? (
                <>
                  <div className="loading-spinner" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Encounter + SOAP 진단 저장
                </>
              )}
            </button>
            <div style={{marginTop: '0.5rem', fontSize: '0.85rem', color: '#6b7280'}}>
              총 {Object.values(soapData).reduce((sum, entries) => sum + entries.length, 0)}개 항목이 저장됩니다
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagnosisPrescriptionPanel;