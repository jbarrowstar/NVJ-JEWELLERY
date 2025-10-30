import Layout from '../components/Layout';
import { useEffect, useState } from 'react';
import {
  FaFileInvoice,
  FaHistory,
  FaRupeeSign,
  FaFileAlt,
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

type Order = {
  grandTotal: number;
  date: string;
};

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:3001/api/orders')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch orders');
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          setOrders(data.orders);
        } else {
          throw new Error('Invalid response');
        }
      })
      .catch((err) => {
        console.error('Dashboard fetch error:', err);
        setError('Unable to load dashboard data');
      })
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString('en-IN');
  const todaySales = orders
    .filter((order) => order.date === today)
    .reduce((sum, order) => sum + order.grandTotal, 0);

  const totalInvoices = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.grandTotal, 0);

  return (
    <Layout>
      <h2 className="text-xl font-bold mb-6 text-yellow-700">Welcome to Billing Overview</h2>

      {/* 🧭 Quick Actions */}
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white shadow rounded p-6 relative">
          <FaFileInvoice className="h-5 w-5 text-gray-400 absolute top-4 right-4" />
          <h4 className="text-md font-semibold mb-2">Create New Bill</h4>
          <p className="text-sm text-gray-600 mb-4">
            Generate a new invoice for a customer's gold purchase.
          </p>
          <button
            onClick={() => navigate('/billing')}
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
          >
            Start New Bill
          </button>
        </div>

        <div className="bg-white shadow rounded p-6 relative">
          <FaHistory className="h-5 w-5 text-gray-400 absolute top-4 right-4" />
          <h4 className="text-md font-semibold mb-2">View All Transactions</h4>
          <p className="text-sm text-gray-600 mb-4">
            Browse and search through all past billing records and receipts.
          </p>
          <button
            onClick={() => navigate('/orders')}
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
          >
            View History
          </button>
        </div>
      </div>

      {/* 📊 Billing Summary */}
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Billing Summary</h3>
      {loading ? (
        <p className="text-sm text-gray-500">Loading summary...</p>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SummaryCard
            title="Today's Gold Sales"
            value={`₹ ${todaySales.toLocaleString()}`}
            icon={<FaRupeeSign className="h-5 w-5 text-gray-400 absolute top-4 right-4" />}
          />
          <SummaryCard
            title="Total Invoices Issued"
            value={totalInvoices.toLocaleString()}
            icon={<FaFileAlt className="h-5 w-5 text-gray-400 absolute top-4 right-4" />}
          />
          <SummaryCard
            title="Total Revenue"
            value={`₹ ${totalRevenue.toLocaleString()}`}
            icon={<FaRupeeSign className="h-5 w-5 text-gray-400 absolute top-4 right-4" />}
          />
        </div>
      )}
    </Layout>
  );
}

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white shadow rounded p-6 text-left relative">
      {icon}
      <h4 className="text-md font-medium text-gray-600 mb-2">{title}</h4>
      <p className="text-xl font-bold text-yellow-700">{value}</p>
    </div>
  );
}
