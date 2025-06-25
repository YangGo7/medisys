// src/components/EMR/AssignedPatientList.jsx
// 🔥 진료실 배정 해제 기능 완전 수정된 버전

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { User, Clock, MapPin, X, Check, AlertCircle, Loader } from 'lucide-react';

const AssignedPatientList = ({ onPatientSelect, selectedPatient, refreshTrigger, searchTerm }) => {
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unassignLoading, setUnassignLoading] = useState(null); // 배정 해제 로딩 상태
  
  const API_BASE = process.env.REACT_APP_INTEGRATION_API;

  const fetchAssigned = async () => {
    setLoading(true);
    try {
      console.log('🔄 배정된 환자 목록 조회 시작');
      const res = await axios.get(`${API_BASE}identifier-waiting/`);
      
      const unique = res.data
        .filter(p => p.assigned_room) // 이미 배정된 환자만 필터링
        .reduce((acc, p) => {
          const key = p.openmrs_patient_uuid || p.uuid;
          if (!acc.find(x => (x.openmrs_patient_uuid || x.uuid) === key)) {
            acc.push(p);
          }
          return acc;
        }, []);
        
      console.log(`✅ 배정된 환자 ${unique.length}명 조회 완료`);
      setAssignedPatients(unique);
      setError(null);
    } catch (err) {
      console.error('❌ 배정된 환자 목록 조회 실패:', err);
      setError('배정된 환자 목록을 불러오는 중 오류가 발생했습니다.');
      setAssignedPatients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssigned();
  }, []);

  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('🔄 새로고침 트리거:', refreshTrigger);
      fetchAssigned();
    }
  }, [refreshTrigger]);

  // 🔥 수정된 배정 해제 함수
  const handleUnassign = async (patient) => {
    if (!patient) {
      alert('환자 정보가 올바르지 않습니다.');
      return;
    }

    const patientName = patient.name || patient.display || patient.patient_identifier || '알 수 없는 환자';
    const mappingId = patient.mapping_id || patient.id;
    const currentRoom = patient.assigned_room;

    console.log('🔄 배정 해제 시도:', {
      patient: patientName,
      mapping_id: mappingId,
      room: currentRoom
    });

    if (!mappingId) {
      alert('환자의 매핑 ID를 찾을 수 없습니다.');
      return;
    }

    if (!window.confirm(`${patientName}님의 진료실 배정을 해제하시겠습니까?\n(진료실 ${currentRoom}번에서 해제됩니다)`)) {
      return;
    }

    setUnassignLoading(mappingId);

    try {
      const requestData = {
        mapping_id: mappingId,
        room: currentRoom
      };

      console.log('📡 배정 해제 API 요청:', requestData);

      const response = await axios.post(`${API_BASE}unassign-room/`, requestData);

      console.log('📡 배정 해제 API 응답:', response.data);

      if (response.data.success) {
        alert(`${patientName}님의 진료실 배정이 해제되었습니다.`);
        fetchAssigned(); // 해제 후 목록 새로고침
      } else {
        throw new Error(response.data.error || '배정 해제에 실패했습니다.');
      }

    } catch (err) {
      console.error('❌ 배정 해제 실패:', err);
      const errorMessage = err.response?.data?.error || err.message || '배정 해제에 실패했습니다.';
      alert(`배정 해제 실패: ${errorMessage}`);
    } finally {
      setUnassignLoading(null);
    }
  };

  // 🔥 새로운 진료 완료 함수
  const handleCompleteTreatment = async (patient) => {
    if (!patient) {
      alert('환자 정보가 올바르지 않습니다.');
      return;
    }

    const patientName = patient.name || patient.display || patient.patient_identifier || '알 수 없는 환자';
    const mappingId = patient.mapping_id || patient.id;
    const currentRoom = patient.assigned_room;

    console.log('✅ 진료 완료 시도:', {
      patient: patientName,
      mapping_id: mappingId,
      room: currentRoom
    });

    if (!mappingId) {
      alert('환자의 매핑 ID를 찾을 수 없습니다.');
      return;
    }

    if (!window.confirm(`${patientName}님의 진료를 완료 처리하시겠습니까?\n(진료실 ${currentRoom}번에서 완료 처리됩니다)`)) {
      return;
    }

    setUnassignLoading(mappingId);

    try {
      const requestData = {
        mapping_id: mappingId,
        room: currentRoom
      };

      console.log('📡 진료 완료 API 요청:', requestData);

      const response = await axios.post(`${API_BASE}complete-treatment/`, requestData);

      console.log('📡 진료 완료 API 응답:', response.data);

      if (response.data.success) {
        alert(`${patientName}님의 진료가 완료되었습니다.`);
        fetchAssigned(); // 완료 후 목록 새로고침
      } else {
        throw new Error(response.data.error || '진료 완료 처리에 실패했습니다.');
      }

    } catch (err) {
      console.error('❌ 진료 완료 처리 실패:', err);
      const errorMessage = err.response?.data?.error || err.message || '진료 완료 처리에 실패했습니다.';
      alert(`진료 완료 처리 실패: ${errorMessage}`);
    } finally {
      setUnassignLoading(null);
    }
  };

  // 검색 필터링
  const filteredPatients = assignedPatients.filter(patient => {
    if (!searchTerm || searchTerm.trim() === '') return true;
    
    const term = searchTerm.toLowerCase();
    const name = (patient.name || patient.display || '').toLowerCase();
    const identifier = (patient.patient_identifier || '').toLowerCase();
    
    return name.includes(term) || identifier.includes(term);
  });

  // 로딩 상태
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2 text-gray-500">
          <Loader className="w-5 h-5 animate-spin" />
          <span>배정된 환자 목록을 불러오는 중...</span>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        <div className="flex items-center mb-2">
          <AlertCircle className="w-4 h-4 mr-2" />
          <span className="font-medium">오류 발생</span>
        </div>
        <p className="text-sm mb-3">{error}</p>
        <button 
          onClick={fetchAssigned}
          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // 환자가 없는 경우
  if (filteredPatients.length === 0) {
    return (
      <div className="text-center p-8">
        <div className="flex flex-col items-center space-y-3">
          <User className="w-12 h-12 text-gray-300" />
          <div className="text-gray-500">
            {searchTerm ? (
              <>
                <p className="font-medium">검색 결과가 없습니다</p>
                <p className="text-sm">'{searchTerm}'에 맞는 배정된 환자가 없습니다.</p>
              </>
            ) : (
              <>
                <p className="font-medium">배정된 환자가 없습니다</p>
                <p className="text-sm">현재 진료실에 배정된 환자가 없습니다.</p>
              </>
            )}
          </div>
          <button 
            onClick={fetchAssigned}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">
          배정된 환자 목록
        </h3>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-600">
            총 {filteredPatients.length}명
          </div>
          <button 
            onClick={fetchAssigned}
            className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
            title="새로고침"
          >
            <Loader className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 환자 목록 */}
      {filteredPatients.map((patient) => {
        const isLoading = unassignLoading === (patient.mapping_id || patient.id);
        const patientName = patient.name || patient.display || patient.patient_identifier || '알 수 없는 환자';
        const isSelected = selectedPatient?.uuid === patient.uuid;
        
        return (
          <div
            key={patient.mapping_id || patient.id || patient.uuid}
            className={`p-4 border rounded-lg transition-all duration-200 ${
              isSelected
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            } ${isLoading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
          >
            {/* 환자 정보 영역 (클릭 가능) */}
            <div onClick={() => onPatientSelect && onPatientSelect(patient)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <User className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div>
                    <div className="font-medium text-gray-900">
                      {patientName}
                    </div>
                    <div className="text-sm text-gray-500 space-x-2">
                      {patient.patient_identifier && (
                        <span>ID: {patient.patient_identifier}</span>
                      )}
                      {patient.age && (
                        <span>• {patient.age}세</span>
                      )}
                      {patient.gender && (
                        <span>• {patient.gender === 'M' ? '남성' : '여성'}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* 진료실 정보 */}
                  <div className="flex items-center text-blue-600 bg-blue-100 px-2 py-1 rounded">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span className="font-medium">{patient.assigned_room}번실</span>
                  </div>
                  
                  {/* 대기 시간 */}
                  {patient.waitTime && patient.waitTime > 0 && (
                    <div className="flex items-center text-amber-600 bg-amber-100 px-2 py-1 rounded">
                      <Clock className="w-4 h-4 mr-1" />
                      <span className="text-sm">{patient.waitTime}분</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 액션 버튼들 */}
            <div className="mt-3 flex items-center justify-end space-x-2">
              {/* 배정 해제 버튼 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnassign(patient);
                }}
                disabled={isLoading}
                className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center ${
                  isLoading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader className="w-3 h-3 mr-1 animate-spin" />
                    처리중...
                  </>
                ) : (
                  <>
                    <X className="w-3 h-3 mr-1" />
                    배정해제
                  </>
                )}
              </button>

              {/* 진료 완료 버튼 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCompleteTreatment(patient);
                }}
                disabled={isLoading}
                className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center ${
                  isLoading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader className="w-3 h-3 mr-1 animate-spin" />
                    처리중...
                  </>
                ) : (
                  <>
                    <Check className="w-3 h-3 mr-1" />
                    진료완료
                  </>
                )}
              </button>
            </div>

            {/* 환자 상태 및 추가 정보 */}
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-2">
                {patient.status && (
                  <span className={`px-2 py-1 rounded ${
                    patient.status === 'assigned' ? 'bg-blue-100 text-blue-700' :
                    patient.status === 'waiting' ? 'bg-yellow-100 text-yellow-700' :
                    patient.status === 'complete' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {patient.status}
                  </span>
                )}
                {patient.created_at && (
                  <span>
                    접수: {new Date(patient.created_at).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                )}
              </div>
              
              <div className="text-gray-400">
                ID: {patient.mapping_id || patient.id}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AssignedPatientList;