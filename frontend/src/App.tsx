import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';

// Staff Pages
import Dashboard from './pages/Dashboard';
import BillingPage from './pages/BillingPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import ReturnsPage from './pages/ReturnsPage';
import CustomerPage from './pages/CustomerPage';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminEmployeePage from './pages/AdminEmployeePage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Shared */}
        <Route path="/" element={<Login />} />

        {/* Staff */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/orders" element={<OrderHistoryPage />} />
        <Route path="/returns" element={<ReturnsPage />} />
        <Route path="/customers" element={<CustomerPage />} />

        {/* Admin */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminEmployeePage />} />
        
      </Routes>
    </Router>
  );
}

export default App;
