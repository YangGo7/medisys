// frontend> src > components > tests.jsx

import React, { useState, useEffect } from 'react';
import { Search, User, Calendar, MapPin, Phone, Mail, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

const OpenMRSPatientList = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);

  // API Base URL
  const API_BASE_URL = 'http://localhost:8000/api';

  // 연결 테스트
  const testConnection = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/test-connections/`);
      const data = await response.json();
      setConnectionStatus(data);
    } catch (err) {
      setError('서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 환자 검색
  const searchPatients = async (query = '') => {
    if (!query.trim()) {
      setPatients([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/openmrs/patients/search/?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setPatients(data.results || []);
    } catch (err) {
      setError(`환자 검색 실패: ${err.message}`);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  // 환자 상세 정보 조회
  const getPatientDetails = async (uuid) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/openmrs/patients/${uuid}/`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setSelectedPatient(data);
    } catch (err) {
      setError(`환자 정보 조회 실패: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 검색 입력 처리
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // 디바운싱을 위한 타이머
    const timeoutId = setTimeout(() => {
      searchPatients(value);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  // 컴포넌트 마운트 시 연결 테스트
  useEffect(() => {
    testConnection();
  }, []);

  // 나이 계산
  const calculateAge = (birthdate) => {
    if (!birthdate) return '알 수 없음';
    const today = new Date();
    const birth = new Date(birthdate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      return age - 1;
    }
    return age;
  };

  // 성별 표시
  const getGenderDisplay = (gender) => {
    return gender === 'M' ? '남성' : gender === 'F' ? '여성' : '알 수 없음';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">OpenMRS 환자 관리</h1>
              <p className="text-gray-600">환자 검색 및 정보 조회</p>
            </div>
            
            {/* 연결 상태 */}
            <div className="flex items-center space-x-4">
              <button
                onClick={testConnection}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                연결 테스트
              </button>
              
              {connectionStatus && (
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    connectionStatus.connections?.openmrs ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className={`text-sm font-medium ${
                    connectionStatus.connections?.openmrs ? 'text-green-700' : 'text-red-700'
                  }`}>
                    OpenMRS {connectionStatus.connections?.openmrs ? '연결됨' : '연결 실패'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 검색 섹션 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="환자 이름 또는 ID로 검색..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {loading && (
            <div className="flex items-center justify-center mt-4">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">검색 중...</span>
            </div>
          )}
        </div>

        {/* 오류 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 환자 목록 */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                검색 결과 ({patients.length}명)
              </h2>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {patients.length === 0 && searchQuery && !loading ? (
                <div className="p-6 text-center text-gray-500">
                  <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>검색 결과가 없습니다.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {patients.map((patient) => (
                    <div
                      key={patient.uuid}
                      onClick={() => getPatientDetails(patient.uuid)}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedPatient?.uuid === patient.uuid ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {patient.name || '이름 없음'}
                          </h3>
                          <div className="mt-1 space-y-1">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">ID:</span> {patient.identifier || 'N/A'}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">성별:</span> {getGenderDisplay(patient.gender)}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">나이:</span> {calculateAge(patient.birthdate)}세
                            </p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400">
                          클릭하여 상세보기
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 환자 상세 정보 */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">환자 상세 정보</h2>
            </div>
            
            <div className="p-6">
              {selectedPatient ? (
                <div className="space-y-6">
                  {/* 기본 정보 */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">기본 정보</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center">
                        <User className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">{selectedPatient.name}</p>
                          <p className="text-sm text-gray-600">환자명</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {selectedPatient.birthdate} ({calculateAge(selectedPatient.birthdate)}세)
                          </p>
                          <p className="text-sm text-gray-600">생년월일</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">성별</p>
                          <p className="font-medium">{getGenderDisplay(selectedPatient.gender)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">환자 ID</p>
                          <p className="font-medium">{selectedPatient.identifier || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 식별자 정보 */}
                  {selectedPatient.identifiers && selectedPatient.identifiers.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">식별자</h3>
                      <div className="space-y-2">
                        {selectedPatient.identifiers.map((identifier, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex justify-between">
                              <span className="font-medium">{identifier.identifier}</span>
                              <span className="text-sm text-gray-600">{identifier.identifierType}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 주소 정보 */}
                  {selectedPatient.addresses && selectedPatient.addresses.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">주소</h3>
                      <div className="space-y-2">
                        {selectedPatient.addresses.map((address, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-start">
                              <MapPin className="w-4 h-4 text-gray-400 mr-2 mt-1" />
                              <div>
                                <p className="font-medium">
                                  {[address.address1, address.address2].filter(Boolean).join(', ')}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {[address.cityVillage, address.stateProvince, address.country]
                                    .filter(Boolean).join(', ')}
                                </p>
                                {address.postalCode && (
                                  <p className="text-sm text-gray-600">우편번호: {address.postalCode}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* UUID */}
                  <div className="border-t pt-4">
                    <p className="text-xs text-gray-500">UUID: {selectedPatient.uuid}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>환자를 선택하면 상세 정보가 표시됩니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpenMRSPatientList;