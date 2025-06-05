import React, { useEffect, useState } from 'react';
import axios from 'axios';

const PatientList = () => {
  const [allPatients, setAllPatients] = useState([]); // 모든 환자 목록 저장
  const [filteredPatients, setFilteredPatients] = useState([]); // 화면에 보여줄 필터링된 환자 목록
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState(''); // 검색어 상태 추가

  const API_URL =
    process.env.REACT_APP_DJANGO_API_URL ||
    'http://localhost:8000/api/integration/openmrs-patients/';

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log(`🔍 Django 백엔드 API 요청: ${API_URL}`);
        const response = await axios.get(API_URL, {
          timeout: 10000,
        });
        console.log('✅ 응답:', response);
        setAllPatients(response.data || []); // 모든 환자 목록 저장
        setFilteredPatients(response.data || []); // 초기에는 모든 환자를 보여줌
      } catch (err) {
        console.error('❌ 환자 목록 조회 실패:', err);
        if (err.response) {
          setError(
            `서버 에러 (${err.response.status}): ${
              err.response.data?.error ||
              err.response.data?.detail ||
              err.message
            }`
          );
        } else if (err.request) {
          setError(
            '서버에 응답이 없습니다. 네트워크 상태 또는 Django 서버 상태를 확인해주세요.'
          );
        } else {
          setError(`요청 오류: ${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  // 검색어 변경 시 필터링된 환자 목록 업데이트
  useEffect(() => {
    if (searchTerm === '') {
      setFilteredPatients(allPatients);
    } else {
      setFilteredPatients(
        allPatients.filter((patient) =>
          (patient.person?.display || patient.display || '') // 이름 필드 확인
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        )
      );
    }
  }, [searchTerm, allPatients]);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const formatBirthdate = (birthdate) => {
    try {
      return new Date(birthdate).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  const calculateAge = (birthdate) => {
    if (!birthdate) return 'N/A';
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  if (loading) return <p>🔄 환자 목록을 불러오는 중입니다...</p>;
  if (error) {
    return (
      <div style={{ color: 'red' }}>
        <h3>🚨 오류 발생</h3>
        <pre>{error}</pre>
        <p>관리자에게 문의하거나 설정을 확인해주세요.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>👥 환자 목록 (Django API 연동)</h2>
      {/* 검색 입력 필드 추가 */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="환자 이름으로 검색..."
          value={searchTerm}
          onChange={handleSearchChange}
          style={{ padding: '8px', width: '300px' }}
        />
      </div>

      {filteredPatients.length > 0 ? ( // patients 대신 filteredPatients 사용
        <table border="1" cellPadding="8" cellSpacing="0">
          <thead>
            <tr>
              <th>식별자</th>
              <th>이름</th>
              <th>성별</th>
              <th>나이</th>
              <th>생년월일</th>
              <th>UUID</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.map((patient) => ( // patients 대신 filteredPatients 사용
              <tr key={patient.uuid}>
                <td>
                  {patient.identifiers?.[0]?.identifier ||
                    patient.identifier ||
                    'N/A'}
                </td>
                <td>{patient.person?.display || patient.display || 'N/A'}</td>
                <td>{patient.person?.gender || 'N/A'}</td>
                <td>{calculateAge(patient.person?.birthdate)}</td>
                <td>{formatBirthdate(patient.person?.birthdate)}</td>
                <td>{patient.uuid}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>❗ 검색 결과가 없거나 등록된 환자가 없습니다.</p>
      )}
    </div>
  );
};

export default PatientList;