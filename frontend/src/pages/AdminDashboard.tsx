import Layout from '../components/Layout';
import { useEffect, useState } from 'react';
import { FaChartLine, FaRupeeSign, FaBoxOpen } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

type Order = {
  grandTotal: number;
  date: string;
};

type StockItem = {
  name: string;
  quantity: number;
};

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [lowStock, setLowStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:3001/api/orders').then((res) => res.json()),
      fetch('http://localhost:3001/api/products/low-stock').then((res) => res.json()),
    ])
      .then(([orderData, stockData]) => {
        if (orderData.success) setOrders(orderData.orders);
        if (stockData.success) setLowStock(stockData.items);
      })
      .catch((err) => {
        console.error('Admin dashboard fetch error:', err);
        setError('Unable to load admin dashboard data');
      })
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString('en-IN');
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-IN');

  const todayOrders = orders.filter((order) => order.date === today);
  const yesterdayOrders = orders.filter((order) => order.date === yesterday);

  const todaySales = todayOrders.reduce((sum, order) => sum + order.grandTotal, 0);
  const yesterdaySales = yesterdayOrders.reduce((sum, order) => sum + order.grandTotal, 0);

  const salesDiff = todaySales - yesterdaySales;
  const salesPercent = yesterdaySales ? ((salesDiff / yesterdaySales) * 100).toFixed(2) : '—';

  const monthlySales = getMonthlySales(orders);

  return (
    <Layout>
      <h2 className="text-xl font-bold mb-6 text-yellow-700 flex items-center gap-2">
        <FaBoxOpen /> Dashboard Overview
      </h2>

      {/* 🧮 Daily Performance */}
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Daily Performance Summary</h3>
      {loading ? (
        <p className="text-sm text-gray-500">Loading summary...</p>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <SummaryCard
            title="Sales Today"
            value={`₹ ${todaySales.toLocaleString('en-IN')}`}
            sub={`Compared to yesterday: ₹ ${salesDiff.toLocaleString('en-IN')} (${salesPercent}%)`}
            icon={<FaRupeeSign className="h-5 w-5 text-gray-400 absolute top-4 right-4" />}
          />
          <SummaryCard
            title="Items Sold Today"
            value={todayOrders.length.toString()}
            sub={`Compared to yesterday: ${yesterdayOrders.length} orders`}
            icon={<FaChartLine className="h-5 w-5 text-gray-400 absolute top-4 right-4" />}
          />
        </div>
      )}

      {/* 📈 Sales Trend Chart */}
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Sales Trend Over Time</h3>
      <div className="bg-white shadow rounded p-6 mb-8">
        <Line
          data={{
            labels: monthlySales.labels,
            datasets: [
              {
                label: 'Monthly Sales',
                data: monthlySales.values,
                borderColor: '#CC9200',
                backgroundColor: 'rgba(204, 146, 0, 0.2)',
                tension: 0.3,
              },
            ],
          }}
          options={{
            responsive: true,
            plugins: {
              legend: { display: false },
              tooltip: { mode: 'index', intersect: false },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: (value) => `₹${value.toLocaleString('en-IN')}`,
                },
              },
            },
          }}
        />
      </div>

      {/* 📦 Stock Alerts */}
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Stock Alerts</h3>
      <div className="bg-white shadow rounded p-6 mb-8">
        {lowStock.length === 0 ? (
          <p className="text-sm text-gray-500">All items sufficiently stocked.</p>
        ) : (
          <ul className="space-y-2">
            {lowStock.map((item, idx) => (
              <li key={idx} className="flex justify-between items-center text-sm">
                <span>{item.name}</span>
                <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs">
                  Only {item.quantity} left
                </span>
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={() => navigate('/admin/products')}
          className="mt-4 bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
        >
          View Inventory
        </button>
      </div>
    </Layout>
  );
}

function SummaryCard({
  title,
  value,
  sub,
  icon,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white shadow rounded p-6 text-left relative">
      {icon}
      <h4 className="text-md font-medium text-gray-600 mb-2">{title}</h4>
      <p className="text-xl font-bold text-yellow-700">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function getMonthlySales(orders: Order[]) {
  const monthlyMap: { [month: string]: number } = {};

  orders.forEach((order) => {
    const month = new Date(order.date).toLocaleString('en-IN', { month: 'short' });
    monthlyMap[month] = (monthlyMap[month] || 0) + order.grandTotal;
  });

  const labels = Object.keys(monthlyMap);
  const values = labels.map((m) => monthlyMap[m]);

  return { labels, values };
}
