import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, 
  Plus, 
  Trash2, 
  Search,
  Check, 
  Calendar, 
  Loader,
  User,
  Activity,
  ChevronDown,
  X
} from 'lucide-react';

// 자동완성 컴포넌트
const AutocompleteInput = ({ 
  value, 
  onChange, 
  onSelect, 
  placeholder, 
  searchType = 'diagnosis', // 'diagnosis' or 'drug'
  apiBase = 'http://35.225.63.41:8000/api/'
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const suggestionRefs = useRef([]);

  // 디바운스를 위한 타이머
  const searchTimeoutRef = useRef(null);

  const searchConcepts = async (query) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    
    try {
      let endpoint;
      if (searchType === 'diagnosis') {
        endpoint = `${apiBase}openmrs-models/openmrs-clinical/search-diagnosis/?q=${encodeURIComponent(query)}`;
      } else if (searchType === 'drug') {
        endpoint = `${apiBase}openmrs-models/openmrs-clinical/search-drugs/?q=${encodeURIComponent(query)}`;
      } else {
        endpoint = `${apiBase}openmrs-models/search-concepts-obs/?q=${encodeURIComponent(query)}&type=${searchType}`;
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success !== false) {
        const results = data.results || [];
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setHighlightedIndex(-1);
      }
    } catch (error) {
      console.error('검색 실패:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);

    // 디바운스 적용 (300ms)
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchConcepts(newValue);
    }, 300);
  };

  const handleSuggestionClick = (suggestion) => {
    onSelect(suggestion);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

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

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inputRef.current && !inputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 하이라이트된 항목으로 스크롤
  useEffect(() => {
    if (highlightedIndex >= 0 && suggestionRefs.current[highlightedIndex]) {
      suggestionRefs.current[highlightedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [highlightedIndex]);

  return (
    <div className="relative" ref={inputRef}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => value.length >= 2 && setShowSuggestions(suggestions.length > 0)}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {loading ? (
            <Loader className="h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <Search className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.uuid || index}
              ref={el => suggestionRefs.current[index] = el}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`px-3 py-2 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                index === highlightedIndex 
                  ? 'bg-blue-50 text-blue-900' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="font-medium text-sm">
                {suggestion.display || suggestion.name}
              </div>
              {suggestion.conceptClass && (
                <div className="text-xs text-gray-500 mt-1">
                  {suggestion.conceptClass}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 메인 진단/처방 패널 컴포넌트
const DiagnosisPrescriptionPanel = ({ patient, panelType = 'both' }) => {
  const [formData, setFormData] = useState({
    diagnosis: [],
    prescriptions: [],
    notes: '',
    weight: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [error, setError] = useState(null);

  // 새 진단 추가를 위한 상태
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const [newPrescription, setNewPrescription] = useState({
    drug: '',
    dosage: '',
    frequency: '',
    duration: ''
  });

  const API_BASE = 'http://35.225.63.41:8000/api/';
  
  // 환자 UUID 추출
  const patientUuid = patient?.person?.uuid || patient?.uuid || patient?.openmrs_patient_uuid;
  const patientName = patient?.name || patient?.display || patient?.patient_name;

  // 진단 추가
  const handleAddDiagnosis = (selectedConcept) => {
    if (selectedConcept && selectedConcept.display) {
      const newDiag = {
        id: Date.now(),
        concept_uuid: selectedConcept.uuid,
        display: selectedConcept.display,
        value: selectedConcept.display,
        type: 'primary'
      };
      
      setFormData(prev => ({
        ...prev,
        diagnosis: [...prev.diagnosis, newDiag]
      }));
      
      setNewDiagnosis('');
    }
  };

  // 처방 추가
  const handleAddPrescription = (selectedDrug) => {
    if (selectedDrug && selectedDrug.display) {
      const newPresc = {
        id: Date.now(),
        drug_uuid: selectedDrug.uuid,
        drug_name: selectedDrug.display,
        dosage: newPrescription.dosage,
        frequency: newPrescription.frequency,
        duration: newPrescription.duration
      };
      
      setFormData(prev => ({
        ...prev,
        prescriptions: [...prev.prescriptions, newPresc]
      }));
      
      setNewPrescription({
        drug: '',
        dosage: '',
        frequency: '',
        duration: ''
      });
    }
  };

  // 진단 삭제
  const removeDiagnosis = (id) => {
    setFormData(prev => ({
      ...prev,
      diagnosis: prev.diagnosis.filter(d => d.id !== id)
    }));
  };

  // 처방 삭제
  const removePrescription = (id) => {
    setFormData(prev => ({
      ...prev,
      prescriptions: prev.prescriptions.filter(p => p.id !== id)
    }));
  };

  // 저장 함수
  const handleSave = async () => {
    if (!patientUuid) {
      setError('환자 정보가 없습니다.');
      return;
    }

    setLoading(true);
    setSaveStatus(null);
    setError(null);

    try {
      const payload = {
        diagnoses: formData.diagnosis.map(d => ({
          concept_uuid: d.concept_uuid,
          value: d.value,
          type: d.type
        })),
        prescriptions: formData.prescriptions.map(p => ({
          drug_uuid: p.drug_uuid,
          drug_name: p.drug_name,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.duration
        })),
        clinical_notes: formData.notes,
        weight: formData.weight
      };

      const response = await fetch(
        `${API_BASE}openmrs-models/patient/${patientUuid}/save-obs-clinical/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(30000)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        throw new Error(data.error || '저장 실패');
      }
    } catch (error) {
      console.error('저장 실패:', error);
      setError(error.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!patient) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="text-center text-gray-500">
          환자를 선택해주세요.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Activity className="h-6 w-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">진단 및 처방</h2>
            <p className="text-sm text-gray-600">
              환자: {patientName} ({patientUuid?.slice(0, 8)}...)
            </p>
          </div>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <X className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* 성공 메시지 */}
      {saveStatus === 'success' && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <Check className="h-5 w-5 text-green-500 mr-2" />
            <span className="text-green-700">저장되었습니다.</span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* 진단 섹션 */}
        {(panelType === 'both' || panelType === 'diagnosis') && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">진단</h3>
            
            {/* 새 진단 추가 */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                새 진단 추가 (예: 'd' 입력하면 'd'로 시작하는 병명 표시)
              </label>
              <AutocompleteInput
                value={newDiagnosis}
                onChange={setNewDiagnosis}
                onSelect={handleAddDiagnosis}
                placeholder="진단명을 입력하세요... (예: diabetes, depression)"
                searchType="diagnosis"
                apiBase={API_BASE}
              />
            </div>

            {/* 진단 목록 */}
            <div className="space-y-2">
              {formData.diagnosis.map((diagnosis) => (
                <div key={diagnosis.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <span className="font-medium text-blue-900">{diagnosis.display}</span>
                    <span className="ml-2 text-xs text-blue-600">({diagnosis.type})</span>
                  </div>
                  <button
                    onClick={() => removeDiagnosis(diagnosis.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 처방 섹션 */}
        {(panelType === 'both' || panelType === 'prescription') && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">처방</h3>
            
            {/* 새 처방 추가 */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    약물명 (예: 'a' 입력하면 'a'로 시작하는 약물 표시)
                  </label>
                  <AutocompleteInput
                    value={newPrescription.drug}
                    onChange={(value) => setNewPrescription(prev => ({ ...prev, drug: value }))}
                    onSelect={(selectedDrug) => {
                      setNewPrescription(prev => ({ ...prev, drug: selectedDrug.display }));
                      handleAddPrescription(selectedDrug);
                    }}
                    placeholder="약물명을 입력하세요... (예: aspirin, acetaminophen)"
                    searchType="drug"
                    apiBase={API_BASE}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">용량</label>
                  <input
                    type="text"
                    value={newPrescription.dosage}
                    onChange={(e) => setNewPrescription(prev => ({ ...prev, dosage: e.target.value }))}
                    placeholder="예: 500mg"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">복용 빈도</label>
                  <input
                    type="text"
                    value={newPrescription.frequency}
                    onChange={(e) => setNewPrescription(prev => ({ ...prev, frequency: e.target.value }))}
                    placeholder="예: 1일 3회"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">복용 기간</label>
                  <input
                    type="text"
                    value={newPrescription.duration}
                    onChange={(e) => setNewPrescription(prev => ({ ...prev, duration: e.target.value }))}
                    placeholder="예: 7일"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 처방 목록 */}
            <div className="space-y-2">
              {formData.prescriptions.map((prescription) => (
                <div key={prescription.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <span className="font-medium text-green-900">{prescription.drug_name}</span>
                    <div className="text-sm text-green-700">
                      {prescription.dosage} | {prescription.frequency} | {prescription.duration}
                    </div>
                  </div>
                  <button
                    onClick={() => removePrescription(prescription.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 임상 노트 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">임상 노트</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="환자 상태, 치료 계획 등을 입력하세요..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 저장 버튼 */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading || (!formData.diagnosis.length && !formData.prescriptions.length && !formData.notes.trim())}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            <span>{loading ? '저장 중...' : '저장'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// 데모용 컴포넌트
const Demo = () => {
  const [selectedPatient] = useState({
    uuid: '550e8400-e29b-41d4-a716-446655440000',
    name: '김철수',
    person: {
      uuid: '550e8400-e29b-41d4-a716-446655440000'
    }
  });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">CDSS - 진단/처방 자동완성 시스템</h1>
      
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">사용법:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 진단란에 'diabetes', 'hypertension' 등 영문 질병명 입력</li>
          <li>• 처방란에 'aspirin', 'metformin' 등 영문 약물명 입력</li>
          <li>• 키보드 화살표로 선택, Enter로 확정, Esc로 취소</li>
          <li>• 'd'를 치면 'd'로 시작하는 질병명들이 자동완성됩니다</li>
        </ul>
      </div>

      <DiagnosisPrescriptionPanel 
        patient={selectedPatient}
        panelType="both"
      />
    </div>
  );
};

export default Demo;