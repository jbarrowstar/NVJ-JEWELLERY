import Layout from '../components/Layout';
import { useEffect, useState } from 'react';
import { FaChartLine, FaRupeeSign, FaBoxOpen, FaEdit, FaSync, FaTimes } from 'react-icons/fa';
import { Line } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { fetchOrders, type Order } from '../services/orderService';
import { fetchRates, updateRate, type GoldPurities } from '../services/rateService';

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [goldRates, setGoldRates] = useState<Record<GoldPurities, number>>({
    '24K': 0,
    '22K': 0,
    '18K': 0,
  });
  const [silverRate, setSilverRate] = useState<number>(0);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [editModes, setEditModes] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [orderData, rateData] = await Promise.all([
          fetchOrders(),
          fetchRates()
        ]);

        if (orderData.success) setOrders(orderData.orders);
        
        setGoldRates(rateData.gold);
        setSilverRate(rateData.silver);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        toast.error('Unable to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleUpdateRate = async (
    metal: 'gold' | 'silver',
    price: number,
    purity: GoldPurities | null,
    onSuccess: () => void
  ) => {
    try {
      const data = await updateRate(metal, price, purity);
      
      if (data.success) {
        if (metal === 'gold' && purity) {
          setGoldRates((prev) => ({ ...prev, [purity]: data.rate.price }));
        } else {
          setSilverRate(data.rate.price);
        }
        onSuccess();
        toast.success(`${metal.toUpperCase()} ${purity ?? ''} rate updated to ₹${data.rate.price.toLocaleString()}`);
      } else {
        toast.error(`Failed to update ${metal} rate`);
      }
    } catch (error) {
      toast.error(`Error updating ${metal} rate`);
    }
  };

  const today = new Date().toLocaleDateString('en-IN');
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-IN');

  const todayOrders = orders.filter((order) => order.date === today);
  const yesterdayOrders = orders.filter((order) => order.date === yesterday);

  const todaySales = todayOrders.reduce((sum, order) => sum + order.grandTotal, 0);
  const yesterdaySales = yesterdayOrders.reduce((sum, order) => sum + order.grandTotal, 0);

  const salesDiff = todaySales - yesterdaySales;
  const salesPercent = yesterdaySales ? ((salesDiff / yesterdaySales) * 100).toFixed(2) : '—';

  const monthlySales = getMonthlySales(orders);

  const refreshData = async () => {
    setLoading(true);
    try {
      const [orderData, rateData] = await Promise.all([
        fetchOrders(),
        fetchRates()
      ]);

      if (orderData.success) setOrders(orderData.orders);
      setGoldRates(rateData.gold);
      setSilverRate(rateData.silver);
      toast.success('Dashboard data refreshed');
    } catch (err) {
      console.error('Refresh error:', err);
      toast.error('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-yellow-700 flex items-center gap-2">
          <FaChartLine /> Dashboard Overview
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

      {/* Rates Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Today's Gold & Silver Rates</h3>
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['24K', '22K', '18K'] as GoldPurities[]).map((purity) => {
            const key = `gold-${purity}`;
            return (
              <RateCard
                key={key}
                title={`${purity} Gold`}
                rate={goldRates[purity]}
                input={inputs[key] ?? ''}
                setInput={(val) => setInputs((p) => ({ ...p, [key]: val }))}
                edit={editModes[key] ?? false}
                setEdit={(val) => setEditModes((p) => ({ ...p, [key]: val }))}
                onApply={(rate) =>
                  handleUpdateRate('gold', rate, purity, () =>
                    setEditModes((p) => ({ ...p, [key]: false }))
                  )
                }
              />
            );
          })}
          <RateCard
            key="silver"
            title="Silver"
            rate={silverRate}
            input={inputs['silver'] ?? ''}
            setInput={(val) => setInputs((p) => ({ ...p, silver: val }))}
            edit={editModes['silver'] ?? false}
            setEdit={(val) => setEditModes((p) => ({ ...p, silver: val }))}
            onApply={(rate) =>
              handleUpdateRate('silver', rate, null, () =>
                setEditModes((p) => ({ ...p, silver: false }))
              )
            }
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <SummaryCard
          title="Sales Today"
          value={`₹${todaySales.toLocaleString('en-IN')}`}
          sub={`Compared to yesterday: ${salesDiff >= 0 ? '+' : ''}₹${salesDiff.toLocaleString('en-IN')} (${salesPercent}%)`}
          trend={salesDiff >= 0 ? 'up' : 'down'}
          icon={<FaChartLine className="h-6 w-6" />}
        />
        <SummaryCard
          title="Orders Today"
          value={todayOrders.length.toString()}
          sub={`Compared to yesterday: ${yesterdayOrders.length} orders`}
          trend={todayOrders.length >= yesterdayOrders.length ? 'up' : 'down'}
          icon={<FaBoxOpen className="h-6 w-6" />}
        />
      </div>

      {/* Sales Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800">Sales Trend Over Time</h3>
          <div className="text-sm text-gray-500">
            {monthlySales.labels.length} months data
          </div>
        </div>
        <div className="h-[300px]">
          <Line
            data={{
              labels: monthlySales.labels,
              datasets: [
                {
                  label: 'Monthly Sales',
                  data: monthlySales.values,
                  borderColor: '#D97706',
                  backgroundColor: 'rgba(217, 119, 6, 0.1)',
                  tension: 0.4,
                  fill: true,
                  pointBackgroundColor: '#D97706',
                  pointBorderColor: '#ffffff',
                  pointBorderWidth: 2,
                  pointRadius: 4,
                  pointHoverRadius: 6,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { 
                  display: false 
                },
                tooltip: { 
                  mode: 'index', 
                  intersect: false,
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  titleColor: '#ffffff',
                  bodyColor: '#ffffff',
                  borderColor: '#D97706',
                  borderWidth: 1,
                  callbacks: {
                    label: function(context) {
                      const value = context.parsed.y;
                      return `Sales: ₹${value !== null ? value.toLocaleString('en-IN') : '0'}`;
                    }
                  }
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: {
                    color: 'rgba(0, 0, 0, 0.1)',
                  },
                  ticks: {
                    callback: (value) => `₹${Number(value).toLocaleString('en-IN')}`,
                    color: '#6B7280',
                  },
                  border: {
                    dash: [4, 4],
                  },
                },
                x: {
                  grid: {
                    color: 'rgba(0, 0, 0, 0.1)',
                  },
                  ticks: {
                    autoSkip: true,
                    maxTicksLimit: 12,
                    color: '#6B7280',
                  },
                  border: {
                    dash: [4, 4],
                  },
                },
              },
              interaction: {
                intersect: false,
                mode: 'nearest',
              },
            }}
          />
        </div>
        
        {/* Chart Summary */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-lg text-gray-800">
                {monthlySales.labels.length}
              </div>
              <div className="text-gray-600">Months Tracked</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg text-green-600">
                ₹{Math.max(...monthlySales.values).toLocaleString('en-IN')}
              </div>
              <div className="text-gray-600">Peak Sales</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg text-yellow-600">
                ₹{monthlySales.values.reduce((a, b) => a + b, 0).toLocaleString('en-IN')}
              </div>
              <div className="text-gray-600">Total Tracked</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-2 rounded-lg">
              <FaBoxOpen className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-yellow-800">Total Orders</p>
              <p className="text-lg font-bold text-yellow-700">{orders.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <FaRupeeSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-800">Lifetime Sales</p>
              <p className="text-lg font-bold text-green-700">
                ₹{orders.reduce((sum, order) => sum + order.grandTotal, 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <FaChartLine className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-800">Avg. Order Value</p>
              <p className="text-lg font-bold text-blue-700">
                ₹{orders.length > 0 ? (orders.reduce((sum, order) => sum + order.grandTotal, 0) / orders.length).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '0'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function RateCard({
  title,
  rate,
  input,
  setInput,
  edit,
  setEdit,
  onApply,
}: {
  title: string;
  rate: number | undefined;
  input: string;
  setInput: (val: string) => void;
  edit: boolean;
  setEdit: (val: boolean) => void;
  onApply: (rate: number) => void;
}) {
  const handleEditClick = () => {
    if (rate !== undefined) {
      setInput(rate.toString());
    }
    setEdit(true);
  };

  const handleCancel = () => {
    setEdit(false);
    setInput('');
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
        <div className="bg-yellow-100 p-1 rounded">
          <FaRupeeSign className="h-3 w-3 text-yellow-600" />
        </div>
      </div>
      
      {edit ? (
        <div className="space-y-3">
          <input
            type="number"
            placeholder="Enter rate per gram"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                const parsed = parseFloat(input);
                if (!isNaN(parsed) && parsed > 0) {
                  onApply(parsed);
                } else {
                  toast.error('Please enter a valid positive number');
                }
              }}
              className="flex-1 bg-yellow-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-yellow-700 transition-colors duration-150 font-medium"
            >
              Update
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-150"
            >
              <FaTimes className="h-3 w-3" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xl font-bold text-yellow-700">
            ₹{rate?.toLocaleString('en-IN')} <span className="text-sm font-normal text-gray-500">/g</span>
          </p>
          <button
            onClick={handleEditClick}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm transition-colors duration-150 flex items-center justify-center gap-2 font-medium"
          >
            <FaEdit className="h-3 w-3" /> Update Rate
          </button>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  sub,
  trend = 'up',
  icon,
}: {
  title: string;
  value: string;
  sub?: string;
  trend?: 'up' | 'down';
  icon: React.ReactNode;
}) {
  const trendColor = trend === 'up' ? 'text-green-600' : 'text-red-600';
  const trendBg = trend === 'up' ? 'bg-green-100' : 'bg-red-100';
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-md font-semibold text-gray-700">{title}</h4>
        <div className={`p-2 rounded-lg ${trendBg}`}>
          <div className="text-gray-600">{icon}</div>
        </div>
      </div>
      
      <p className="text-2xl font-bold text-yellow-700 mb-2">{value}</p>
      
      {sub && (
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${trendColor}`}>
            {trend === 'up' ? '↗' : '↘'}
          </span>
          <span className="text-sm text-gray-600">{sub}</span>
        </div>
      )}
    </div>
  );
}

function getMonthlySales(orders: Order[]) {
  const monthlyMap: { [month: string]: number } = {};

  orders.forEach((order) => {
    const date = new Date(order.createdAt);
    const month = date.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
    monthlyMap[month] = (monthlyMap[month] || 0) + order.grandTotal;
  });

  const sortedMonths = Object.keys(monthlyMap).sort((a, b) => {
    const [aMonth, aYear] = a.split(' ');
    const [bMonth, bYear] = b.split(' ');
    const aDate = new Date(`${aMonth} 1, ${aYear}`);
    const bDate = new Date(`${bMonth} 1, ${bYear}`);
    return aDate.getTime() - bDate.getTime();
  });

  // Limit to last 12 months for better readability
  const recentMonths = sortedMonths.slice(-12);
  const labels = recentMonths;
  const values = labels.map((m) => monthlyMap[m]);

  return { labels, values };
}