import React, { useState } from 'react';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCalendar from './pages/admin/AdminCalendar';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  return (
    <div className="App">
      {currentPage === 'dashboard' ? (
        <AdminDashboard onViewChange={setCurrentPage} />
      ) : (
        <AdminCalendar onViewChange={setCurrentPage} />
      )}
    </div>
  );
}

export default App;
