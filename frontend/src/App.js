import React, { useState } from 'react';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCalendar from './pages/admin/AdminCalendar';
import AdminProfile from './pages/admin/AdminProfile';
import AdminServices from './pages/admin/AdminServices';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminUsers from './pages/admin/AdminUsers';
import AdminReports from './pages/admin/AdminReports';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <AdminDashboard onViewChange={setCurrentPage} />;
      case 'calendar':
        return <AdminCalendar onViewChange={setCurrentPage} />;
      case 'services':
        return <AdminServices onViewChange={setCurrentPage} />;
      case 'customers':
        return <AdminCustomers onViewChange={setCurrentPage} />;
      case 'users':
        return <AdminUsers onViewChange={setCurrentPage} />;
      case 'reports':
        return <AdminReports onViewChange={setCurrentPage} />;
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
