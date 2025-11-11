import Layout from '../components/Layout';
import { useEffect, useState } from 'react';
import {
  FaFileInvoice,
  FaHistory,
  FaRupeeSign,
  FaFileAlt,
  FaSync,
  FaArrowRight,
  FaShoppingCart,
  FaUsers
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { fetchOrders, type Order } from '../services/orderService';

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        const data = await fetchOrders();
        if (data.success) {
          setOrders(data.orders);
        } else {
          throw new Error('Invalid response');
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError('Unable to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  const today = new Date().toLocaleDateString('en-IN');
  const todaySales = orders
    .filter((order) => order.date === today)
    .reduce((sum, order) => sum + order.grandTotal, 0);

  const totalInvoices = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.grandTotal, 0);
  const todayOrders = orders.filter((order) => order.date === today).length;

  const refreshData = async () => {
    setLoading(true);
    try {
      const data = await fetchOrders();
      if (data.success) {
        setOrders(data.orders);
        setError('');
      } else {
        throw new Error('Invalid response');
      }
    } catch (err) {
      console.error('Refresh error:', err);
      setError('Unable to refresh data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-yellow-700 flex items-center gap-2">
          <FaFileInvoice /> Billing Dashboard
        </h2>
        <button
          onClick={refreshData}
          className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 flex items-center gap-2 text-sm transition-colors duration-200"
          disabled={loading}
        >
          <FaSync className={loading ? 'animate-spin' : ''} /> 
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Quick Actions</h3>
          <div className="text-sm text-gray-500">
            Streamline your billing workflow
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ActionCard
            title="Create New Bill"
            description="Generate a new invoice for customer purchases with our streamlined billing interface."
            icon={<FaFileInvoice className="h-6 w-6" />}
            buttonText="Start Billing"
            onClick={() => navigate('/billing')}
            color="yellow"
          />
          <ActionCard
            title="View Transaction History"
            description="Browse and search through all past billing records, receipts, and customer transactions."
            icon={<FaHistory className="h-6 w-6" />}
            buttonText="View History"
            onClick={() => navigate('/orders')}
            color="blue"
          />
        </div>
      </div>

      {/* Billing Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Billing Summary</h3>
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-8">
            <div className="flex justify-center items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600 mr-2"></div>
              Loading dashboard data...
            </div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-8">
            <p>{error}</p>
            <button
              onClick={refreshData}
              className="mt-2 bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 text-sm"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <SummaryCard
                title="Today's Sales"
                value={`₹${todaySales.toLocaleString('en-IN')}`}
                subtitle={`${todayOrders} orders today`}
                icon={<FaRupeeSign className="h-5 w-5" />}
                trend={todaySales > 0 ? 'active' : 'neutral'}
              />
              <SummaryCard
                title="Total Invoices"
                value={totalInvoices.toLocaleString()}
                subtitle="All time invoices issued"
                icon={<FaFileAlt className="h-5 w-5" />}
                trend="neutral"
              />
              <SummaryCard
                title="Total Revenue"
                value={`₹${totalRevenue.toLocaleString('en-IN')}`}
                subtitle="Lifetime revenue generated"
                icon={<FaShoppingCart className="h-5 w-5" />}
                trend="positive"
              />
              <SummaryCard
                title="Avg. Order Value"
                value={`₹${totalInvoices > 0 ? Math.round(totalRevenue / totalInvoices).toLocaleString('en-IN') : '0'}`}
                subtitle="Average per transaction"
                icon={<FaUsers className="h-5 w-5" />}
                trend="neutral"
              />
            </div>

            {/* Additional Stats */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-lg text-gray-800">{todayOrders}</div>
                  <div className="text-gray-600">Today's Orders</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-lg text-green-600">
                    {orders.filter(order => order.date === today).length}
                  </div>
                  <div className="text-gray-600">Today's Invoices</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-lg text-blue-600">
                    {Math.round(totalRevenue / Math.max(totalInvoices, 1)).toLocaleString('en-IN')}
                  </div>
                  <div className="text-gray-600">Avg. Invoice Value</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-lg text-purple-600">
                    {new Set(orders.map(order => order.customer?.phone)).size}
                  </div>
                  <div className="text-gray-600">Unique Customers</div>
                </div>
              </div>
            </div>

            {/* Recent Activity Preview */}
            {orders.length > 0 && (
              <div className="mt-6">
                <h4 className="text-md font-semibold text-gray-700 mb-3">Recent Activity</h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-3 text-left font-semibold text-gray-700">Invoice</th>
                        <th className="p-3 text-left font-semibold text-gray-700">Customer</th>
                        <th className="p-3 text-right font-semibold text-gray-700">Amount</th>
                        <th className="p-3 text-center font-semibold text-gray-700">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 5).map((order) => (
                        <tr key={order._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors duration-150">
                          <td className="p-3 text-gray-800 font-medium">{order.invoiceNumber}</td>
                          <td className="p-3 text-gray-700">{order.customer?.name || '—'}</td>
                          <td className="p-3 text-right font-semibold text-yellow-700">
                            ₹{order.grandTotal.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-center text-gray-600 text-xs">
                            {order.date} {order.time}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {orders.length > 5 && (
                    <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                      <button
                        onClick={() => navigate('/orders')}
                        className="text-yellow-600 hover:text-yellow-700 text-sm font-medium flex items-center gap-1 transition-colors duration-150"
                      >
                        View all {orders.length} transactions
                        <FaArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

function ActionCard({
  title,
  description,
  icon,
  buttonText,
  onClick,
  color = 'yellow'
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  buttonText: string;
  onClick: () => void;
  color?: 'yellow' | 'blue' | 'green';
}) {
  const colorClasses = {
    yellow: 'bg-yellow-100 text-yellow-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600'
  };

  const buttonClasses = {
    yellow: 'bg-yellow-600 hover:bg-yellow-700',
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      
      <h4 className="text-lg font-semibold text-gray-800 mb-2">{title}</h4>
      <p className="text-sm text-gray-600 mb-4 leading-relaxed">{description}</p>
      
      <button
        onClick={onClick}
        className={`w-full text-white px-4 py-3 rounded-lg transition-colors duration-200 font-semibold flex items-center justify-center gap-2 ${buttonClasses[color]}`}
      >
        {buttonText}
        <FaArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  trend = 'neutral'
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'positive' | 'negative' | 'neutral' | 'active';
}) {
  const trendColors = {
    positive: 'text-green-600 bg-green-100',
    negative: 'text-red-600 bg-red-100',
    neutral: 'text-gray-600 bg-gray-100',
    active: 'text-yellow-600 bg-yellow-100'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
        <div className={`p-2 rounded-lg ${trendColors[trend]}`}>
          {icon}
        </div>
      </div>
      
      <p className="text-2xl font-bold text-yellow-700 mb-1">{value}</p>
      
      {subtitle && (
        <p className="text-xs text-gray-500">{subtitle}</p>
      )}
    </div>
  );
}