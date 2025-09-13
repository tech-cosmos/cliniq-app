import React from 'react';
import { Dashboard } from './components/Dashboard';
import './App.css';

function App() {
  // In a real app, you would have authentication and get the doctor ID from the authenticated user
  const doctorId = 'sample-doctor-id';

  return (
    <div className="App">
      <Dashboard doctorId={doctorId} />
    </div>
  );
}

export default App;
