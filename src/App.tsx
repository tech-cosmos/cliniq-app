import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Dashboard } from './components/Dashboard';
import { PatientView } from './components/PatientView';
import './App.css';

function App() {
  // In a real app, you would have authentication and get the doctor ID from the authenticated user
  const doctorId = '550e8400-e29b-41d4-a716-446655440001'; // Dr. Emily Smith

  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard doctorId={doctorId} />} />
          <Route path="/patient/:patientId" element={<PatientView doctorId={doctorId} />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
