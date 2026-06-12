
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCalendar from './pages/admin/AdminCalendar';
import AdminProfile from './pages/admin/AdminProfile';
import AdminServices from './pages/admin/AdminServices';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminUsers from './pages/admin/AdminUsers';
import AdminReports from './pages/admin/AdminReports';
import AdminInventory from './pages/admin/AdminInventory';
import './App.css';


function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(location.pathname.startsWith('/admin/inventory') ? 'inventory' : 'dashboard');

  useEffect(() => {
    if (location.pathname.startsWith('/admin/inventory')) {
      setCurrentPage('inventory');
    }
  }, [location.pathname]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    if (page === 'inventory') {
      navigate('/admin/inventory');
    } else if (location.pathname.startsWith('/admin/inventory')) {
      navigate('/admin');
    }

  };

  const renderPage = () => {
    switch (currentPage) {

      case 'dashboard':
        return <AdminDashboard onViewChange={handlePageChange} />;
      case 'calendar':
        return <AdminCalendar onViewChange={handlePageChange} />;
      case 'services':
        return <AdminServices onViewChange={handlePageChange} />;
      case 'customers':
        return <AdminCustomers onViewChange={handlePageChange} />;
      case 'users':
        return <AdminUsers onViewChange={handlePageChange} />;
      case 'reports':
        return <AdminReports onViewChange={handlePageChange} />;
      case 'profile':
        return <AdminProfile onViewChange={handlePageChange} />;
      case 'inventory':
        return <AdminInventory onViewChange={handlePageChange} />;
      default:
        return <AdminDashboard onViewChange={handlePageChange} />;

    }
  };

  if (!ADMIN_PAGES.has(currentPage)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <div className="App">{renderPage()}</div>;
}

export default App;
