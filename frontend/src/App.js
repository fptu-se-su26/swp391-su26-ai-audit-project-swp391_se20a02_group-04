
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCalendar from './pages/admin/AdminCalendar';
import AdminProfile from './pages/admin/AdminProfile';
import AdminServices from './pages/admin/AdminServices';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminUsers from './pages/admin/AdminUsers';
import AdminReports from './pages/admin/AdminReports';
import AdminInventory from './pages/admin/AdminInventory';
import './App.css';

const ADMIN_PAGES = new Set([
  'dashboard',
  'calendar',
  'services',
  'customers',
  'users',
  'reports',
  'profile',
  'inventory'
]);

const getAdminPageFromPath = (pathname = '') => {
  const [, role, page] = pathname.split('/');
  if (role !== 'admin') return 'dashboard';
  if (page === 'appointments') return 'calendar';
  if (page && ADMIN_PAGES.has(page)) return page;
  return 'dashboard';
};

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [currentPage, setCurrentPage] = useState(getAdminPageFromPath(location.pathname));

  useEffect(() => {
    setCurrentPage(getAdminPageFromPath(location.pathname));
  }, [location.pathname]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    navigate(page === 'dashboard' ? '/admin/dashboard' : `/admin/${page}`);
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
