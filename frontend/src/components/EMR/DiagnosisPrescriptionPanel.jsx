// frontend/src/components/EMR/DiagnosisPrescriptionPanel.jsx
// 🔥 OpenMRS 진단 코드와 AutocompleteInput 완전 통합 버전

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Save, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Check, 
  Calendar, 
  Loader,
  User,
  Activity,
  Search,
  X
} from 'lucide-react';

// =============================================================================
// 🔥 OpenMRS 진단 코드 전용 AutocompleteInput 컴포넌트
// =============================================================================

const AutocompleteInput = ({ 
  value, 
  onChange, 
  onSelect, 
  placeholder = "진단명을 입력하세요...",
  searchType = 'diagnosis',
  apiBase = 'http://35.225.63.41:8000/api/',
  disabled = false
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const inputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const searchDiagnosis = async (query) => {
    if (query.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // 🔥 새로운 간소화된 엔드포인트 사용
      let endpoint;
      
      if (query.length === 1) {
        // 1글자: 접두사 검색
        endpoint = `${apiBase}openmrs-models/diagnosis-prefix/?prefix=${encodeURIComponent(query)}&limit=15`;
      } else {
        // 2글자 이상: 일반 검색
        if (searchType === 'diagnosis') {
          endpoint = `${apiBase}openmrs-models/diagnosis-search/?q=${encodeURIComponent(query)}&limit=15`;
        } else {
          endpoint = `${apiBase}openmrs-models/drug-search/?q=${encodeURIComponent(query)}&limit=15`;
        }
      }

      console.log(`🔍 OpenMRS 진단 검색: ${endpoint}`);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        signal: AbortSignal.timeout(8000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: 서버 오류`);
      }

      const data = await response.json();
      console.log(`📊 진단 검색 결과:`, data);

      if (data.success && data.results) {
        setSuggestions(data.results);
        setShowSuggestions(data.results.length > 0);
        setHighlightedIndex(-1);
        
        if (data.results.length === 0) {
          setError(`"${query}"에 대한 진단을 찾을 수 없습니다.`);
        }
      } else {
        throw new Error(data.error || '검색 결과를 가져올 수 없습니다.');
      }
      
    } catch (error) {
      console.error('🚨 진단 검색 실패:', error);
      setError(`검색 실패: ${error.message}`);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchDiagnosis(newValue);
    }, 300);
  };

  const handleSuggestionClick = (suggestion) => {
    onSelect(suggestion);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    setError(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSuggestionClick(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const clearInput = () => {
    onChange('');
    setSuggestions([]);
    setShowSuggestions(false);
    setError(null);
    inputRef.current?.focus();
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
          } ${error ? 'border-red-500' : 'border-gray-300'}`}
        />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {loading && (
            <Loader className="w-4 h-4 animate-spin text-blue-500" />
          )}
          
          {!loading && value && (
            <button
              onClick={clearInput}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && !loading && (
        <div className="mt-1 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 제안 목록 */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.uuid || index}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`px-3 py-2 cursor-pointer border-b border-gray-100 hover:bg-blue-50 ${
                index === highlightedIndex ? 'bg-blue-100' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {suggestion.display}
                  </div>
                  {suggestion.concept_class && (
                    <div className="text-xs text-gray-500">
                      {suggestion.concept_class}
                    </div>
                  )}
                  {suggestion.concept_id && (
                    <div className="text-xs text-gray-400">
                      ID: {suggestion.concept_id}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-1">
                  {/* OpenMRS 네이티브 표시 */}
                  <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    OpenMRS
                  </div>
                  
                  {/* 진단 타입 표시 */}
                  <div className={`text-xs px-2 py-1 rounded ${
                    suggestion.type === 'diagnosis' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {suggestion.type === 'diagnosis' ? '진단' : '약물'}
                  </div>
                  
                  {/* 접두사 매칭 표시 */}
                  {suggestion.prefix_match && (
                    <div className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                      접두사
                    </div>
                  )}
                  
                  {/* 관련성 점수 표시 (디버깅용) */}
                  {suggestion.relevance_score && (
                    <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      {suggestion.relevance_score}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// 🏥 DiagnosisPrescriptionPanel 메인 컴포넌트
// =============================================================================

const DiagnosisPrescriptionPanel = ({ patient, panelType = 'both' }) => {
  // 기존 상태 관리
  const [formData, setFormData] = useState({
    diagnosis: [],
    prescriptions: [],
    notes: '',
    weight: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null);
  const [error, setError] = useState(null);

  // 🔥 자동완성을 위한 새로운 상태들
  const [newDiagnosisInput, setNewDiagnosisInput] = useState('');
  const [newPrescriptionInput, setNewPrescriptionInput] = useState('');

  // API 설정
  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://35.225.63.41:8000/api/';
  
  // 환자 UUID 추출
  let patientUuid = patient?.person?.uuid ||        
                    patient?.uuid || 
                    patient?.openmrs_patient_uuid || 
                    patient?.patient_uuid ||
                    patient?.PatientUUID;

  const patientName = patient?.name || 
                      patient?.display || 
                      patient?.patient_name ||
                      patient?.PatientName ||
                      patient?.person?.display ||
                      (patient?.identifiers?.[0]?.display);

  // 기존 함수들
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addDiagnosis = () => {
    const newDiagnosis = {
      id: Date.now(),
      diagnosis: '',
      type: 'primary',
      concept_uuid: null
    };
    setFormData(prev => ({
      ...prev,
      diagnosis: [...prev.diagnosis, newDiagnosis]
    }));
  };

  // 🔥 OpenMRS 진단 코드로 진단 추가하는 새로운 함수
  const handleAddDiagnosisWithAutocomplete = (selectedConcept) => {
    if (selectedConcept && selectedConcept.display) {
      const newDiagnosis = {
        id: Date.now(),
        diagnosis: selectedConcept.display,
        type: 'primary',
        concept_uuid: selectedConcept.uuid,
        concept_id: selectedConcept.concept_id,
        concept_class: selectedConcept.concept_class
      };
      
      setFormData(prev => ({
        ...prev,
        diagnosis: [...prev.diagnosis, newDiagnosis]
      }));
      
      setNewDiagnosisInput('');
    }
  };

  const updateDiagnosis = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      diagnosis: prev.diagnosis.map((diag, i) => 
        i === index ? { ...diag, [field]: value } : diag
      )
    }));
  };

  const removeDiagnosis = (index) => {
    setFormData(prev => ({
      ...prev,
      diagnosis: prev.diagnosis.filter((_, i) => i !== index)
    }));
  };

  const addPrescription = () => {
    const newPrescription = {
      id: Date.now(),
      drug: '',
      dosage: '',
      frequency: '',
      duration: '',
      drug_uuid: null
    };
    setFormData(prev => ({
      ...prev,
      prescriptions: [...prev.prescriptions, newPrescription]
    }));
  };

  // 🔥 자동완성으로 처방 추가하는 새로운 함수
  const handleAddPrescriptionWithAutocomplete = (selectedDrug) => {
    if (selectedDrug && selectedDrug.display) {
      const newPrescription = {
        id: Date.now(),
        drug: selectedDrug.display,
        dosage: '',
        frequency: '',
        duration: '',
        drug_uuid: selectedDrug.uuid
      };
      
      setFormData(prev => ({
        ...prev,
        prescriptions: [...prev.prescriptions, newPrescription]
      }));
      
      setNewPrescriptionInput('');
    }
  };

  const updatePrescription = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      prescriptions: prev.prescriptions.map((presc, i) => 
        i === index ? { ...presc, [field]: value } : presc
      )
    }));
  };

  const removePrescription = (index) => {
    setFormData(prev => ({
      ...prev,
      prescriptions: prev.prescriptions.filter((_, i) => i !== index)
    }));
  };

  // 저장 함수
  const handleSave = async () => {
    if (!patientUuid) {
      setSaveStatus('error');
      setError('환자 정보가 없습니다.');
      return;
    }

    setLoading(true);
    setSaveStatus(null);
    setError(null);

    try {
      const payload = {
        diagnosis: formData.diagnosis.map(d => ({
          value: d.diagnosis,
          type: d.type,
          concept_uuid: d.concept_uuid
        })),
        prescriptions: formData.prescriptions.map(p => ({
          drug: p.drug,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.duration,
          drug_uuid: p.drug_uuid
        })),
        notes: formData.notes,
        weight: formData.weight
      };

      console.log('💾 저장 데이터:', payload);

      const response = await fetch(`${API_BASE}openmrs-models/patient/${patientUuid}/save-notes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        setSaveStatus('success');
        console.log('✅ 저장 성공:', result);
      } else {
        throw new Error(result.error || '저장에 실패했습니다.');
      }

    } catch (error) {
      console.error('❌ 저장 실패:', error);
      setSaveStatus('error');
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // 환자 정보 로드
  useEffect(() => {
    if (patientUuid) {
      setPatientInfo({
        uuid: patientUuid,
        name: patientName || 'Unknown Patient',
        display: patient?.display || patientName
      });
    }
  }, [patientUuid, patientName, patient]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Activity className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-800">진단 및 처방</h2>
            {patientInfo && (
              <p className="text-sm text-gray-600">
                환자: {patientInfo.name} (UUID: {patientInfo.uuid?.slice(0, 8)}...)
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {saveStatus === 'success' && (
            <div className="flex items-center text-green-600">
              <Check className="w-4 h-4 mr-1" />
              <span className="text-sm">저장됨</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center text-red-600">
              <AlertCircle className="w-4 h-4 mr-1" />
              <span className="text-sm">오류</span>
            </div>
          )}
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* 진단 섹션 */}
      {(panelType === 'both' || panelType === 'diagnosis') && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-700">진단</h3>
            <button
              onClick={addDiagnosis}
              className="flex items-center px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              <Plus className="w-4 h-4 mr-1" />
              진단 추가
            </button>
          </div>
          
          {/* 🔥 OpenMRS 진단 자동완성 검색 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OpenMRS 진단 검색 <span className="text-green-600">(실제 진단 코드)</span>
            </label>
            <AutocompleteInput
              value={newDiagnosisInput}
              onChange={setNewDiagnosisInput}
              onSelect={handleAddDiagnosisWithAutocomplete}
              placeholder="진단명을 입력하세요... (예: diabetes, hypertension, fever)"
              searchType="diagnosis"
              apiBase={API_BASE}
            />
          </div>
          
          <div className="space-y-3">
            {formData.diagnosis.map((diagnosis, index) => (
              <div key={diagnosis.id || index} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    진단 {index + 1}
                    {diagnosis.concept_uuid && (
                      <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        OpenMRS: {diagnosis.concept_id}
                      </span>
                    )}
                    {diagnosis.concept_class && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {diagnosis.concept_class}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => removeDiagnosis(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="진단명"
                    value={diagnosis.diagnosis}
                    onChange={(e) => updateDiagnosis(index, 'diagnosis', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={diagnosis.type}
                    onChange={(e) => updateDiagnosis(index, 'type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="primary">주진단</option>
                    <option value="secondary">부진단</option>
                    <option value="provisional">임시진단</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 처방 섹션 */}
      {(panelType === 'both' || panelType === 'prescription') && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-700">처방</h3>
            <button
              onClick={addPrescription}
              className="flex items-center px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600"
            >
              <Plus className="w-4 h-4 mr-1" />
              처방 추가
            </button>
          </div>
          
          {/* 🔥 OpenMRS 약물 자동완성 검색 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OpenMRS 약물 검색 <span className="text-green-600">(실제 약물 코드)</span>
            </label>
            <AutocompleteInput
              value={newPrescriptionInput}
              onChange={setNewPrescriptionInput}
              onSelect={handleAddPrescriptionWithAutocomplete}
              placeholder="약물명을 입력하세요... (예: aspirin, acetaminophen, ibuprofen)"
              searchType="drug"
              apiBase={API_BASE}
            />
          </div>
          
          <div className="space-y-3">
            {formData.prescriptions.map((prescription, index) => (
              <div key={prescription.id || index} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    처방 {index + 1}
                    {prescription.drug_uuid && (
                      <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        OpenMRS 약물
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => removePrescription(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="약물명"
                    value={prescription.drug}
                    onChange={(e) => updatePrescription(index, 'drug', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="용량"
                    value={prescription.dosage}
                    onChange={(e) => updatePrescription(index, 'dosage', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="복용 빈도"
                    value={prescription.frequency}
                    onChange={(e) => updatePrescription(index, 'frequency', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="복용 기간"
                    value={prescription.duration}
                    onChange={(e) => updatePrescription(index, 'duration', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 임상 메모 및 체중 */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              임상 메모
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="환자 상태, 치료 계획 등을 입력하세요..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              체중 (kg)
            </label>
            <input
              type="number"
              value={formData.weight}
              onChange={(e) => updateField('weight', e.target.value)}
              placeholder="체중 입력"
              step="0.1"
              min="0"
              max="500"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading || !patientUuid}
          className={`flex items-center px-6 py-2 rounded-md ${
            loading || !patientUuid
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              저장
            </>
          )}
        </button>
      </div>

      {/* 진단/처방 요약 */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">요약</h4>
        <div className="text-sm text-gray-600">
          <p>진단: {formData.diagnosis.length}개</p>
          <p>처방: {formData.prescriptions.length}개</p>
          <p>메모: {formData.notes ? '작성됨' : '없음'}</p>
          <p>체중: {formData.weight ? `${formData.weight} kg` : '미기록'}</p>
        </div>
      </div>
    </div>
  );
};

export default DiagnosisPrescriptionPanel;