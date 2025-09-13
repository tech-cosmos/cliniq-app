import React from 'react';
import { Dashboard } from './components/Dashboard';
import './App.css';

function App() {
  // In a real app, you would have authentication and get the doctor ID from the authenticated user
  const doctorId = '550e8400-e29b-41d4-a716-446655440001'; // Dr. Emily Smith

  return (
    <div className="App">
      <Dashboard doctorId={doctorId} />
    </div>
  );
}

export default App;
