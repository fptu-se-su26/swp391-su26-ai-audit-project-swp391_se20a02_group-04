import React, { useState } from 'react';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCalendar from './pages/admin/AdminCalendar';
import AdminProfile from './pages/admin/AdminProfile';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <AdminDashboard onViewChange={setCurrentPage} />;
      case 'calendar':
        return <AdminCalendar onViewChange={setCurrentPage} />;
      case 'profile':
        return <AdminProfile onViewChange={setCurrentPage} />;
      default:
        return <AdminDashboard onViewChange={setCurrentPage} />;
    }
  };

  return (
    <div className="App">
      {renderPage()}
    </div>
  );
}

export default App;
