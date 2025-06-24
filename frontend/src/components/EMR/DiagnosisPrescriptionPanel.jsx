// frontend/src/components/EMR/DiagnosisPrescriptionPanel.jsx (완전 수정 버전)
/**
 * 진단 및 처방 패널 - JSON/HTML 응답 오류 해결
 */

import React, { useState, useEffect } from 'react';
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
  Activity
} from 'lucide-react';

const DiagnosisPrescriptionPanel = ({ patient, panelType = 'both' }) => {
  // 상태 관리
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

  // API 설정 - 환경변수에서 가져오기
  const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://35.225.63.41:8000/api/';
  const INTEGRATION_API = process.env.REACT_APP_INTEGRATION_API || 'http://35.225.63.41:8000/api/integration/';
  
  // 🔥 수정된 API URL들 - 실제 프로젝트 구조에 맞게
  const CLINICAL_API_BASE = `${API_BASE}openmrs-clinical`;
  const OBS_API_BASE = `${API_BASE}openmrs-models`;

  // 🔥 환자 UUID 추출 - Patient Identifier로 Person UUID 조회
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

  console.log('🔍 환자 정보 디버깅:', {
    patient,
    patientUuid,
    patientName,
    patientKeys: patient ? Object.keys(patient) : 'patient is null',
    // 🔥 Person 구조 확인
    personObject: patient?.person,
    personUuid: patient?.person?.uuid,
    personKeys: patient?.person ? Object.keys(patient.person) : 'person is null',
    patientIdentifier: patient?.patient_identifier
  });

  /**
   * 🔥 안전한 API 요청 함수 - JSON/HTML 응답 오류 해결
   */
  const safeApiRequest = async (url, options = {}) => {
    try {
      console.log(`🌐 API 요청: ${options.method || 'GET'} ${url}`);
      
      const response = await axios({
        url,
        method: 'GET',
        timeout: 30000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        ...options
      });

      console.log(`📡 API 응답: ${response.status} ${url}`);

      // Content-Type 확인
      const contentType = response.headers['content-type'] || '';
      
      // HTML 응답 감지 및 처리
      if (contentType.includes('text/html') || 
          (typeof response.data === 'string' && response.data.trim().startsWith('<!DOCTYPE'))) {
        
        console.error('❌ HTML 응답 수신 (예상: JSON):', {
          url,
          status: response.status,
          contentType,
          dataPreview: typeof response.data === 'string' ? response.data.substring(0, 200) : response.data
        });
        
        throw new Error(`서버가 HTML을 반환했습니다. API 엔드포인트를 확인하세요. (URL: ${url})`);
      }

      // 성공적인 JSON 응답
      return {
        success: true,
        data: response.data,
        status: response.status
      };

    } catch (error) {
      console.error('❌ API 요청 실패:', error);

      if (error.response) {
        // 서버가 응답했지만 오류 상태
        const { status, data } = error.response;
        
        if (typeof data === 'string' && data.trim().startsWith('<!DOCTYPE')) {
          return {
            success: false,
            error: `서버 오류 (${status}): HTML 오류 페이지가 반환되었습니다.`,
            errorType: 'html_response',
            status
          };
        }

        return {
          success: false,
          error: `API 오류 (${status}): ${error.message}`,
          errorType: 'api_error',
          status,
          responseData: data
        };
      } else if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: '요청 시간이 초과되었습니다. 네트워크를 확인하세요.',
          errorType: 'timeout'
        };
      } else if (error.code === 'ERR_NETWORK') {
        return {
          success: false,
          error: '네트워크 연결에 실패했습니다. 서버 상태를 확인하세요.',
          errorType: 'network_error'
        };
      } else {
        return {
          success: false,
          error: error.message || '알 수 없는 오류가 발생했습니다.',
          errorType: 'unknown_error'
        };
      }
    }
  };

  /**
   * Patient Identifier로 Person UUID 조회 함수
   */
  const fetchPersonUuidByIdentifier = async (identifier) => {
    try {
      console.log('🔄 Patient Identifier로 Person UUID 조회 시도:', identifier);
      
      const result = await safeApiRequest(
        `${API_BASE}person-uuid-by-identifier/${identifier}/`,
        { method: 'GET' }
      );

      if (result.success && result.data.person_uuid) {
        console.log('✅ Person UUID 조회 성공:', result.data.person_uuid);
        // 상태 업데이트를 통해 UUID 설정
        setPatientInfo(prev => ({
          ...prev,
          uuid: result.data.person_uuid,
          person_uuid: result.data.person_uuid,
          patient_identifier: identifier,
          name: result.data.patient_name || patientName
        }));
        return result.data.person_uuid;
      } else {
        console.warn('⚠️ Person UUID 조회 실패:', result.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Person UUID 조회 실패:', error);
      return null;
    }
  };

  /**
   * 환자 정보 로드
   */
  const loadPatientInfo = async () => {
    if (!patient) {
      setError('환자 정보가 없습니다');
      setLoadingPatient(false);
      return;
    }

    setLoadingPatient(true);
    setError(null);

    try {
      // 🚨 UUID가 없으면 Patient Identifier로 Person UUID 조회 시도
      if (!patientUuid && patient?.patient_identifier) {
        const foundUuid = await fetchPersonUuidByIdentifier(patient.patient_identifier);
        if (foundUuid) {
          patientUuid = foundUuid;
        }
      }

      if (patientUuid) {
        // UUID가 있으면 추가 환자 정보 로드 시도
        try {
          const result = await safeApiRequest(
            `${INTEGRATION_API}openmrs-patients/${patientUuid}/`,
            { method: 'GET' }
          );

          if (result.success) {
            setPatientInfo(result.data);
            console.log('✅ 환자 정보 로드 성공:', result.data);
          } else {
            // 기본 정보로 설정
            setPatientInfo({
              uuid: patientUuid,
              name: patientName,
              display: patientName,
              patient_identifier: patient?.patient_identifier
            });
          }
        } catch (error) {
          // 기본 정보로 설정
          setPatientInfo({
            uuid: patientUuid,
            name: patientName,
            display: patientName,
            patient_identifier: patient?.patient_identifier
          });
        }
      } else {
        // UUID를 찾을 수 없는 경우
        setPatientInfo({
          name: patientName,
          display: patientName,
          patient_identifier: patient?.patient_identifier,
          uuid: null
        });
      }

    } catch (error) {
      console.error('❌ 환자 정보 로드 실패:', error);
      setError(`환자 정보를 불러올 수 없습니다: ${error.message}`);
    } finally {
      setLoadingPatient(false);
    }
  };

  /**
   * 진료 기록 저장
   */
  const handleSave = async () => {
    // 🔥 UUID 최종 확인 - patientInfo에서 업데이트된 UUID 사용
    const finalPatientUuid = patientInfo?.uuid || 
                            patientInfo?.person_uuid || 
                            patientUuid;

    if (!finalPatientUuid) {
      setSaveStatus({
        type: 'error',
        message: '환자 UUID를 찾을 수 없습니다.',
        details: `Patient Identifier: ${patient?.patient_identifier}. Person UUID 조회가 필요합니다.`
      });
      
      // UUID가 없고 Patient Identifier가 있으면 다시 시도
      if (!finalPatientUuid && patient?.patient_identifier) {
        console.log('🔄 UUID 재조회 시도...');
        await fetchPersonUuidByIdentifier(patient.patient_identifier);
      }
      return;
    }

    if (!formData.notes.trim()) {
      setSaveStatus({
        type: 'error',
        message: '임상 메모를 입력해주세요.',
        details: '진료 내용을 기록하는 것은 필수입니다.'
      });
      return;
    }

    setLoading(true);
    setSaveStatus(null);

    try {
      console.log('💾 진료 기록 저장 시작:', {
        finalPatientUuid,
        patientIdentifier: patient?.patient_identifier,
        formData
      });

      // 🔥 수정: clinical_views.py의 save_clinical_notes_fixed 함수 호출
      const saveData = {
        diagnosis: formData.diagnosis.map(diag => ({
          concept: '159947AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // Primary diagnosis concept
          value: diag.value,
          type: diag.type
        })),
        prescriptions: formData.prescriptions.map(pres => ({
          drug: pres.drug,
          dosage: pres.dosage,
          frequency: pres.frequency,
          duration: pres.duration
        })),
        notes: formData.notes,
        weight: formData.weight
      };

      const result = await safeApiRequest(
        `${CLINICAL_API_BASE}/patient/${finalPatientUuid}/save-notes/`,
        {
          method: 'POST',
          data: saveData
        }
      );

      if (result.success) {
        setSaveStatus({
          type: 'success',
          message: '진료 기록이 성공적으로 저장되었습니다.',
          details: result.data
        });

        console.log('✅ 진료 기록 저장 성공:', result.data);
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('❌ 진료 기록 저장 실패:', error);
      setSaveStatus({
        type: 'error',
        message: '진료 기록 저장에 실패했습니다.',
        details: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 환자 정보 로드
  useEffect(() => {
    if (patient) {
      loadPatientInfo();
    }
  }, [patient]);

  // 상태 메시지 자동 제거
  useEffect(() => {
    if (saveStatus) {
      const timer = setTimeout(() => {
        setSaveStatus(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  /**
   * 폼 필드 업데이트 함수들
   */
  const updateField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addDiagnosis = () => {
    setFormData(prev => ({
      ...prev,
      diagnosis: [...prev.diagnosis, { type: 'primary', value: '' }]
    }));
  };

  const removeDiagnosis = (index) => {
    setFormData(prev => ({
      ...prev,
      diagnosis: prev.diagnosis.filter((_, i) => i !== index)
    }));
  };

  const updateDiagnosis = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      diagnosis: prev.diagnosis.map((diag, i) => 
        i === index ? { ...diag, [field]: value } : diag
      )
    }));
  };

  const addPrescription = () => {
    setFormData(prev => ({
      ...prev,
      prescriptions: [...prev.prescriptions, { 
        drug: '', 
        dosage: '', 
        frequency: '', 
        duration: '' 
      }]
    }));
  };

  const removePrescription = (index) => {
    setFormData(prev => ({
      ...prev,
      prescriptions: prev.prescriptions.filter((_, i) => i !== index)
    }));
  };

  const updatePrescription = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      prescriptions: prev.prescriptions.map((pres, i) => 
        i === index ? { ...pres, [field]: value } : pres
      )
    }));
  };

  // 환자가 선택되지 않은 경우
  if (!patient) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <div className="text-center text-gray-500">
          <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">환자를 선택해주세요</h3>
          <p className="text-sm">진단 및 처방을 입력하려면 먼저 환자를 선택해야 합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border">
      {/* 헤더 */}
      <div className="border-b pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
              <Activity className="w-6 h-6 text-blue-600" />
              <span>진단 및 처방</span>
            </h2>
            <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
              {loadingPatient ? (
                <div className="flex items-center space-x-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>환자 정보 로딩 중...</span>
                </div>
              ) : (
                <span>{patientInfo?.display || patientName || '환자 정보 없음'}</span>
              )}
              <Calendar className="w-4 h-4 ml-4" />
              <span>{new Date().toLocaleDateString('ko-KR')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 오류 메시지 */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertCircle className="w-5 h-5" />
            <div>
              <div className="font-medium">연결 오류</div>
              <div className="text-sm mt-1">{error}</div>
              <button
                onClick={loadPatientInfo}
                className="mt-2 text-sm bg-red-100 hover:bg-red-200 px-3 py-1 rounded transition-colors"
              >
                다시 시도
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상태 메시지 */}
      {saveStatus && (
        <div className={`mb-4 p-4 rounded-lg flex items-center space-x-2 ${
          saveStatus.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
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
          {/* 진단 섹션 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-800">진단</h3>
              <button
                onClick={addDiagnosis}
                className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>추가</span>
              </button>
            </div>
            
            <div className="space-y-2">
              {formData.diagnosis.map((diag, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <select
                    value={diag.type}
                    onChange={(e) => updateDiagnosis(index, 'type', e.target.value)}
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="primary">주진단</option>
                    <option value="secondary">부진단</option>
                  </select>
                  <input
                    type="text"
                    placeholder="진단명"
                    value={diag.value}
                    onChange={(e) => updateDiagnosis(index, 'value', e.target.value)}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <button
                    onClick={() => removeDiagnosis(index)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {formData.diagnosis.length === 0 && (
                <div className="text-gray-500 text-sm italic">
                  진단을 추가하려면 "추가" 버튼을 클릭하세요
                </div>
              )}
            </div>
          </div>

          {/* 처방 섹션 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-800">처방</h3>
              <button
                onClick={addPrescription}
                className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>추가</span>
              </button>
            </div>
            
            <div className="space-y-3">
              {formData.prescriptions.map((prescription, index) => (
                <div key={index} className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">처방 {index + 1}</span>
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
                  처방을 추가하려면 "추가" 버튼을 클릭하세요
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