import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import BillingPage from './pages/BillingPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import ReturnsPage from './pages/ReturnsPage';
import CustomerPage from './pages/CustomerPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/orders" element={<OrderHistoryPage />} />
        <Route path="/returns" element={<ReturnsPage />} />
        <Route path="/customers" element={<CustomerPage />} />
      </Routes>
    </Router>
  );
}

export default App;
