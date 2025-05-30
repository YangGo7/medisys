import React, { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL?.replace(/\/$/, '');

const OCSLogSearch = ({ onSelectPatient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/integration/openmrs/patients/search?q=${searchTerm}`);
      setResults(res.data.results);
      setError('');
    } catch (err) {
      setError('환자 검색 실패');
      setResults([]);
    }
  };

  return (
    <div className="ocs-controls">
      <input
        className="ocs-controls-input"
        type="text"
        placeholder="환자 이름 또는 ID 검색"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <button className="ocs-controls-button" onClick={handleSearch}>검색</button>
      {error && <p className="ocs-error-message">{error}</p>}
      <ul>
        {results.map((patient) => (
          <li key={patient.uuid}>
            <button onClick={() => onSelectPatient(patient)}>
              {patient.display} ({patient.uuid})
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default OCSLogSearch;