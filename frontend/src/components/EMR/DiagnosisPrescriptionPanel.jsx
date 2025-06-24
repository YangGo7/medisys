// frontend/src/components/EMR/DiagnosisPrescriptionPanel.jsx (자동완성 기능 통합 버전)
/**
 * 진단 및 처방 패널 - OpenMRS 자동완성 기능 통합
 */

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

// 🔥 자동완성 컴포넌트 추가
const AutocompleteInput = ({ 
  value, 
  onChange, 
  onSelect, 
  placeholder, 
  searchType = 'diagnosis', // 'diagnosis' or 'drug'
  apiBase = 'http://35.225.63.41:8000/api/',
  disabled = false
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const suggestionRefs = useRef([]);
  const searchTimeoutRef = useRef(null);

  const searchConcepts = async (query) => {
    if (query.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    
    try {
      let endpoint;
      let useDummyData = false;
      
      // 🔥 API 시도 (실패시 더미 데이터 사용)
      if (searchType === 'diagnosis') {
        endpoint = `${apiBase}openmrs-models/openmrs-clinical/search-diagnosis/?q=${encodeURIComponent(query)}`;
      } else if (searchType === 'drug') {
        endpoint = `${apiBase}openmrs-models/openmrs-clinical/search-drugs/?q=${encodeURIComponent(query)}`;
      } else {
        // 일반 concept 검색
        endpoint = `${apiBase}openmrs-models/search-concepts-obs/?q=${encodeURIComponent(query)}&type=${searchType}`;
      }

      let results = [];

      // API 시도
      if (query.length >= 2) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(5000)
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success !== false && data.results && data.results.length > 0) {
              results = data.results;
            } else {
              useDummyData = true;
            }
          } else {
            useDummyData = true;
          }
        } catch (error) {
          console.warn('API 검색 실패, 더미 데이터 사용:', error);
          useDummyData = true;
        }
      } else {
        // 1글자는 더미 데이터만 사용
        useDummyData = true;
      }

      // 🔥 더미 데이터 사용
      if (useDummyData || results.length === 0) {
        results = getDummyData(query, searchType);
      }

      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setHighlightedIndex(-1);

    } catch (error) {
      console.error('검색 실패:', error);
      // 에러 발생시에도 더미 데이터 시도
      const dummyResults = getDummyData(query, searchType);
      setSuggestions(dummyResults);
      setShowSuggestions(dummyResults.length > 0);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 더미 데이터 생성 함수 (확장된 버전)
  const getDummyData = (query, type) => {
    const lowerQuery = query.toLowerCase();
    
    if (type === 'diagnosis') {
      const dummyDiagnoses = [
        // D로 시작하는 질병들
        { uuid: 'dummy-d1', display: 'Diabetes mellitus', conceptClass: 'Diagnosis' },
        { uuid: 'dummy-d2', display: 'Depression', conceptClass: 'Diagnosis' },
        { uuid: 'dummy-d3', display: 'Dermatitis', conceptClass: 'Diagnosis' },
        { uuid: 'dummy-d4', display: 'Diarrhea', conceptClass: 'Diagnosis' },
        { uuid: 'dummy-d5', display: 'Dyspepsia', conceptClass: 'Diagnosis' },
        
        // H로 시작하는 질병들
        { uuid: 'dummy-h1', display: 'Hypertension', conceptClass: 'Diagnosis' },
        { uuid: 'dummy-h2', display: 'Headache', conceptClass: 'Diagnosis' },
        { uuid: 'dummy-h3', display: 'Heart disease', conceptClass: 'Diagnosis' },
        { uuid: 'dummy-h4', display: 'Hepatitis', conceptClass: 'Diagnosis' },
        { uuid: 'dummy-h5', display: 'Hyperlipidemia', conceptClass: 'Diagnosis' },
        
        // P로 시작하는 질병들
        { uuid: 'dummy-p1', display: 'Pneumonia', conceptClass: 'Diagnosis' },
        { uuid: 'dummy-p2', display: 'Pain', conceptClass: 'Diagnosis' },
        { uuid: 'dummy-p3', display: 'Psoriasis', conceptClass: 'Diagnosis' },
        { uuid: 'dummy-p4', display: 'Peptic ulcer', conceptClass: 'Diagnosis' },
        
        // A로 시작하는 질병들
        { uuid: 'dummy-a1', display: 'Arthritis', conceptClass: 'Diagnosis' },
        { uuid: 'dummy-a2', display: 'Asthma', conceptClass: 'Diagnosis' },
        { uuid: 'dummy-a3', display: 'Anemia', conceptClass: 'Diagnosis' },
        { uuid: 'dummy-a4', display: 'Anxiety disorder', conceptClass: 'Diagnosis' },
        
        // 기타
        { uuid: 'dummy-c1', display: 'Common cold', conceptClass: 'Diagnosis' },
        { uuid: 'dummy-c2', display: 'Chest pain', conceptClass: 'Diagnosis' },
        { uuid: 'dummy-f1', display: 'Fever', conceptClass: 'Diagnosis' },
        { uuid: 'dummy-f2', display: 'Fatigue', conceptClass: 'Diagnosis' },
        { uuid: 'dummy-i1', display: 'Insomnia', conceptClass: 'Diagnosis' },
        { uuid: 'dummy-m1', display: 'Migraine', conceptClass: 'Diagnosis' },
        { uuid: 'dummy-n1', display: 'Nausea', conceptClass: 'Diagnosis' },
        { uuid: 'dummy-o1', display: 'Obesity', conceptClass: 'Diagnosis' },
        { uuid: 'dummy-s1', display: 'Sinusitis', conceptClass: 'Diagnosis' },
        { uuid: 'dummy-u1', display: 'Urinary tract infection', conceptClass: 'Diagnosis' },
      ];
      
      return dummyDiagnoses.filter(item => 
        item.display.toLowerCase().includes(lowerQuery) ||
        item.display.toLowerCase().startsWith(lowerQuery)
      ).slice(0, 10);
      
    } else if (type === 'drug') {
      const dummyDrugs = [
        // A로 시작하는 약물들
        { uuid: 'dummy-drug-a1', display: 'Aspirin', conceptClass: 'Drug', strength: '325mg' },
        { uuid: 'dummy-drug-a2', display: 'Acetaminophen', conceptClass: 'Drug', strength: '500mg' },
        { uuid: 'dummy-drug-a3', display: 'Amoxicillin', conceptClass: 'Drug', strength: '250mg' },
        { uuid: 'dummy-drug-a4', display: 'Atorvastatin', conceptClass: 'Drug', strength: '20mg' },
        { uuid: 'dummy-drug-a5', display: 'Azithromycin', conceptClass: 'Drug', strength: '250mg' },
        { uuid: 'dummy-drug-a6', display: 'Amlodipine', conceptClass: 'Drug', strength: '5mg' },
        
        // M로 시작하는 약물들
        { uuid: 'dummy-drug-m1', display: 'Metformin', conceptClass: 'Drug', strength: '500mg' },
        { uuid: 'dummy-drug-m2', display: 'Morphine', conceptClass: 'Drug', strength: '10mg' },
        { uuid: 'dummy-drug-m3', display: 'Metoprolol', conceptClass: 'Drug', strength: '25mg' },
        { uuid: 'dummy-drug-m4', display: 'Metronidazole', conceptClass: 'Drug', strength: '400mg' },
        
        // L로 시작하는 약물들
        { uuid: 'dummy-drug-l1', display: 'Lisinopril', conceptClass: 'Drug', strength: '10mg' },
        { uuid: 'dummy-drug-l2', display: 'Losartan', conceptClass: 'Drug', strength: '50mg' },
        { uuid: 'dummy-drug-l3', display: 'Levothyroxine', conceptClass: 'Drug', strength: '50mcg' },
        { uuid: 'dummy-drug-l4', display: 'Lorazepam', conceptClass: 'Drug', strength: '1mg' },
        
        // I로 시작하는 약물들
        { uuid: 'dummy-drug-i1', display: 'Ibuprofen', conceptClass: 'Drug', strength: '200mg' },
        { uuid: 'dummy-drug-i2', display: 'Insulin', conceptClass: 'Drug', strength: '100U/ml' },
        { uuid: 'dummy-drug-i3', display: 'Isoniazid', conceptClass: 'Drug', strength: '300mg' },
        
        // 기타
        { uuid: 'dummy-drug-c1', display: 'Ciprofloxacin', conceptClass: 'Drug', strength: '500mg' },
        { uuid: 'dummy-drug-c2', display: 'Cephalexin', conceptClass: 'Drug', strength: '250mg' },
        { uuid: 'dummy-drug-d1', display: 'Diazepam', conceptClass: 'Drug', strength: '5mg' },
        { uuid: 'dummy-drug-d2', display: 'Doxycycline', conceptClass: 'Drug', strength: '100mg' },
        { uuid: 'dummy-drug-f1', display: 'Furosemide', conceptClass: 'Drug', strength: '40mg' },
        { uuid: 'dummy-drug-h1', display: 'Hydrochlorothiazide', conceptClass: 'Drug', strength: '25mg' },
        { uuid: 'dummy-drug-o1', display: 'Omeprazole', conceptClass: 'Drug', strength: '20mg' },
        { uuid: 'dummy-drug-p1', display: 'Prednisolone', conceptClass: 'Drug', strength: '5mg' },
        { uuid: 'dummy-drug-s1', display: 'Simvastatin', conceptClass: 'Drug', strength: '20mg' },
        { uuid: 'dummy-drug-w1', display: 'Warfarin', conceptClass: 'Drug', strength: '5mg' },
      ];
      
      return dummyDrugs.filter(item => 
        item.display.toLowerCase().includes(lowerQuery) ||
        item.display.toLowerCase().startsWith(lowerQuery)
      ).slice(0, 10);
    }
    
    return [];
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // 🔥 1글자부터 검색 지원 (향상된 API 사용)
    if (newValue.length >= 1) {
      const debounceTime = newValue.length === 1 ? 100 : 300; // 1글자는 빠르게, 2글자 이상은 일반 속도
      
      searchTimeoutRef.current = setTimeout(() => {
        searchConcepts(newValue);
      }, debounceTime);
    } else {
      // 빈 문자열이면 제안 사항 숨기기
      setSuggestions([]);
      setShowSuggestions(false);
    }
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inputRef.current && !inputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          onFocus={() => value.length >= 1 && setShowSuggestions(suggestions.length > 0)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {loading ? (
            <Loader className="h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <Search className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>
      
      {showSuggestions && suggestions.length > 0 && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {value.length === 1 && (
            <div className="px-3 py-2 bg-blue-50 border-b border-blue-200 text-xs text-blue-700">
              <strong>'{value}'</strong>로 시작하는 {searchType === 'diagnosis' ? '질병명' : '약물명'} ({suggestions.length}개)
              <span className="ml-2 bg-yellow-100 text-yellow-700 px-1 rounded">데모 데이터</span>
            </div>
          )}
          {value.length >= 2 && (
            <div className="px-3 py-2 bg-green-50 border-b border-green-200 text-xs text-green-700">
              <strong>'{value}'</strong> 검색 결과 ({suggestions.length}개) - {searchType === 'diagnosis' ? '질병명' : '약물명'}
              <span className="ml-2 bg-yellow-100 text-yellow-700 px-1 rounded">데모 데이터</span>
            </div>
          )}
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
                {suggestion.uuid && suggestion.uuid.startsWith('dummy-') && (
                  <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1 rounded">샘플</span>
                )}
              </div>
              <div className="flex items-center justify-between mt-1">
                {(suggestion.conceptClass || suggestion.concept_class) && (
                  <div className="text-xs text-gray-500">
                    {suggestion.conceptClass || suggestion.concept_class}
                  </div>
                )}
                {suggestion.type && (
                  <div className={`text-xs px-2 py-1 rounded ${
                    suggestion.type === 'diagnosis' 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {suggestion.type === 'diagnosis' ? '진단' : '약물'}
                  </div>
                )}
                {suggestion.strength && (
                  <div className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                    {suggestion.strength}
                  </div>
                )}
                {suggestion.prefix_match && (
                  <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    접두사 매칭
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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
  const INTEGRATION_API = process.env.REACT_APP_INTEGRATION_API || 'http://35.225.63.41:8000/api/integration/';
  
  const CLINICAL_API_BASE = `${API_BASE}openmrs-clinical`;
  const OBS_API_BASE = `${API_BASE}openmrs-models`;

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
      concept_uuid: null // 🔥 OpenMRS concept UUID 추가
    };
    setFormData(prev => ({
      ...prev,
      diagnosis: [...prev.diagnosis, newDiagnosis]
    }));
  };

  // 🔥 자동완성으로 진단 추가하는 새로운 함수
  const handleAddDiagnosisWithAutocomplete = (selectedConcept) => {
    if (selectedConcept && selectedConcept.display) {
      const newDiagnosis = {
        id: Date.now(),
        diagnosis: selectedConcept.display,
        type: 'primary',
        concept_uuid: selectedConcept.uuid // 🔥 OpenMRS concept UUID 저장
      };
      
      setFormData(prev => ({
        ...prev,
        diagnosis: [...prev.diagnosis, newDiagnosis]
      }));
      
      setNewDiagnosisInput(''); // 입력 필드 초기화
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
      drug_uuid: null // 🔥 OpenMRS drug UUID 추가
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
        drug_uuid: selectedDrug.uuid // 🔥 OpenMRS drug UUID 저장
      };
      
      setFormData(prev => ({
        ...prev,
        prescriptions: [...prev.prescriptions, newPrescription]
      }));
      
      setNewPrescriptionInput(''); // 입력 필드 초기화
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

  // 환자 정보 조회
  useEffect(() => {
    if (patientUuid) {
      fetchPatientInfo();
    }
  }, [patientUuid]);

  const fetchPatientInfo = async () => {
    if (!patientUuid) return;
    
    setLoadingPatient(true);
    try {
      const response = await axios.get(
        `${OBS_API_BASE}/patient/${patientUuid}/obs-clinical-data/`,
        { timeout: 10000 }
      );
      
      if (response.data.success) {
        setPatientInfo(response.data.patient_info);
      }
    } catch (error) {
      console.error('환자 정보 조회 실패:', error);
    } finally {
      setLoadingPatient(false);
    }
  };

  // 🔥 향상된 저장 함수
  const handleSave = async () => {
    if (!patientUuid) {
      setError('환자 정보가 없습니다.');
      return;
    }

    if (!formData.notes.trim()) {
      setError('임상 메모는 필수입니다.');
      return;
    }

    setLoading(true);
    setSaveStatus(null);
    setError(null);

    try {
      // OpenMRS 저장용 데이터 준비
      const payload = {
        diagnoses: formData.diagnosis.map(d => ({
          concept_uuid: d.concept_uuid,
          value: d.diagnosis,
          type: d.type
        })),
        prescriptions: formData.prescriptions.map(p => ({
          drug_uuid: p.drug_uuid,
          drug_name: p.drug,
          dosage: p.dosage,
          frequency: p.frequency,
          duration: p.duration
        })),
        clinical_notes: formData.notes,
        weight: formData.weight
      };

      const response = await axios.post(
        `${OBS_API_BASE}/patient/${patientUuid}/save-obs-clinical/`,
        payload,
        { timeout: 30000 }
      );

      if (response.data.success) {
        setSaveStatus({
          type: 'success',
          message: '진료 기록이 성공적으로 저장되었습니다.',
          details: response.data
        });

        // 5초 후 상태 메시지 자동 제거
        setTimeout(() => setSaveStatus(null), 5000);
      } else {
        throw new Error(response.data.error || '저장 실패');
      }
    } catch (error) {
      console.error('저장 실패:', error);
      setSaveStatus({
        type: 'error',
        message: '저장 중 오류가 발생했습니다.',
        details: error.response?.data?.error || error.message
      });
      setError(error.response?.data?.error || error.message || '저장 중 오류가 발생했습니다.');
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
    <div className="max-w-5xl mx-auto p-6 bg-white rounded-lg shadow">
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

      {/* 🔥 사용법 안내 - 현실적 버전 */}
      <div className="mb-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <h3 className="font-medium text-yellow-900 mb-2">🔍 자동완성 검색 (데모 버전):</h3>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• <strong>현재 상태:</strong> OpenMRS 서버 연결 대기중, 데모 데이터로 동작</li>
          <li>• <strong>진단 예시:</strong> 'd' → diabetes, depression | 'h' → hypertension, headache</li>
          <li>• <strong>약물 예시:</strong> 'a' → aspirin, acetaminophen | 'm' → metformin, morphine</li>
          <li>• <strong>키보드 탐색:</strong> ↑↓ 화살표로 선택, Enter로 확정, Esc로 취소</li>
          <li>• <strong>참고:</strong> 실제 OpenMRS 연결시 실시간 데이터베이스 검색으로 전환됩니다</li>
        </ul>
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

      {/* 상태 메시지 */}
      {saveStatus && (
        <div className={`mb-4 p-3 flex items-start space-x-3 rounded-md ${
          saveStatus.type === 'success' ? 
            'bg-green-50 border border-green-200 text-green-800' : 
            'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {saveStatus.type === 'success' ? 
            <Check className="w-5 h-5" /> : 
            <AlertCircle className="w-5 h-5" />
          }
          <div>
            <div className="font-medium">{saveStatus.message}</div>
            {saveStatus.details && (
              <div className="text-sm mt-1">
                {typeof saveStatus.details === 'object' ? 
                  `Encounter: ${saveStatus.details.encounter_uuid?.substring(0, 8)}...` :
                  saveStatus.details
                }
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 왼쪽: 기본 정보 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              임상 메모 *
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="환자 상태, 진료 내용, 특이사항 등을 기록하세요..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
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
              placeholder="70"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 오른쪽: 진단 및 처방 */}
        <div className="space-y-6">
          {/* 🔥 진단 섹션 - 자동완성 통합 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-800">진단</h3>
              <button
                onClick={addDiagnosis}
                className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>수동 추가</span>
              </button>
            </div>

            {/* 🔥 자동완성 진단 추가 */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                진단 자동완성 검색 <span className="text-orange-600">(데모 데이터)</span>
              </label>
              <AutocompleteInput
                value={newDiagnosisInput}
                onChange={setNewDiagnosisInput}
                onSelect={handleAddDiagnosisWithAutocomplete}
                placeholder="진단명을 입력하세요... (예: d, diabetes, hypertension)"
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
                      {diagnosis.concept_uuid && !diagnosis.concept_uuid.startsWith('dummy-') && (
                        <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          OpenMRS 연동
                        </span>
                      )}
                      {diagnosis.concept_uuid && diagnosis.concept_uuid.startsWith('dummy-') && (
                        <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                          데모 데이터
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
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <select
                      value={diagnosis.type}
                      onChange={(e) => updateDiagnosis(index, 'type', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="primary">주진단</option>
                      <option value="secondary">부진단</option>
                      <option value="provisional">임시진단</option>
                    </select>
                  </div>
                </div>
              ))}
              
              {formData.diagnosis.length === 0 && (
                <div className="text-gray-500 text-sm italic">
                  자동완성 검색 또는 "수동 추가" 버튼으로 진단을 추가하세요
                </div>
              )}
            </div>
          </div>

          {/* 🔥 처방 섹션 - 자동완성 통합 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-800">처방</h3>
              <button
                onClick={addPrescription}
                className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>수동 추가</span>
              </button>
            </div>

            {/* 🔥 자동완성 처방 추가 */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                약물 자동완성 검색 <span className="text-orange-600">(데모 데이터)</span>
              </label>
              <AutocompleteInput
                value={newPrescriptionInput}
                onChange={setNewPrescriptionInput}
                onSelect={handleAddPrescriptionWithAutocomplete}
                placeholder="약물명을 입력하세요... (예: a, aspirin, metformin)"
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
                      {prescription.drug_uuid && !prescription.drug_uuid.startsWith('dummy-') && (
                        <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          OpenMRS 연동
                        </span>
                      )}
                      {prescription.drug_uuid && prescription.drug_uuid.startsWith('dummy-') && (
                        <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                          데모 데이터
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
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="약물명"
                      value={prescription.drug}
                      onChange={(e) => updatePrescription(index, 'drug', e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="용량"
                        value={prescription.dosage}
                        onChange={(e) => updatePrescription(index, 'dosage', e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="text"
                        placeholder="빈도"
                        value={prescription.frequency}
                        onChange={(e) => updatePrescription(index, 'frequency', e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="text"
                        placeholder="기간"
                        value={prescription.duration}
                        onChange={(e) => updatePrescription(index, 'duration', e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {formData.prescriptions.length === 0 && (
                <div className="text-gray-500 text-sm italic">
                  자동완성 검색 또는 "수동 추가" 버튼으로 처방을 추가하세요
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 저장 버튼 */}
      <div className="mt-8 pt-4 border-t">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            <div>환자 ID: {patient?.patient_identifier || 'Unknown'}</div>
            <div>UUID: {patientInfo?.uuid || patientUuid || '조회 중...'}</div>
            {patientInfo && (
              <div className="mt-1">
                <span className="font-medium">이름:</span> {patientInfo.name || patientName}
              </div>
            )}
            {/* 🔥 데모 모드 상태 표시 */}
            <div className="mt-2 text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded border border-yellow-200">
              ⚠️ 현재 데모 모드로 동작중 - OpenMRS 서버 연결 대기
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={loading || !formData.notes.trim() || loadingPatient}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
              loading || !formData.notes.trim() || loadingPatient
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
            }`}
          >
            <Save className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? '저장 중...' : '진료 기록 저장'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiagnosisPrescriptionPanel;