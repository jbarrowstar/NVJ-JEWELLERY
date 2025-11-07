import Layout from '../components/Layout';
import { useEffect, useState } from 'react';
import { FaChartLine, FaRupeeSign, FaBoxOpen, FaEdit } from 'react-icons/fa';
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

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

type Order = {
  grandTotal: number;
  date: string;
  createdAt: string;
};

type GoldPurity = '24K' | '22K' | '18K';

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [goldRates, setGoldRates] = useState<Record<GoldPurity, number>>({
    '24K': 0,
    '22K': 0,
    '18K': 0,
  });
  const [silverRate, setSilverRate] = useState<number>(0);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [editModes, setEditModes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:3001/api/orders').then((res) => res.json()),
      fetch('http://localhost:3001/api/rates').then((res) => res.json()),
    ])
      .then(([orderData, rateData]) => {
        if (orderData.success) setOrders(orderData.orders);
        if (rateData.success) {
          const gold: Record<GoldPurity, number> = { '24K': 0, '22K': 0, '18K': 0 };
          let silver = 0;
          for (const r of rateData.rates) {
            if (r.metal === 'gold' && r.purity) gold[r.purity as GoldPurity] = r.price;
            if (r.metal === 'silver') silver = r.price;
          }
          setGoldRates(gold);
          setSilverRate(silver);
        }
      })
      .catch((err) => {
        console.error('Dashboard fetch error:', err);
        toast.error('Unable to load dashboard data');
      });
  }, []);

  const updateRate = (
    metal: 'gold' | 'silver',
    price: number,
    purity: GoldPurity | null,
    onSuccess: () => void
  ) => {
    fetch(`http://localhost:3001/api/rates/${metal}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price, purity }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (metal === 'gold' && purity) {
            setGoldRates((prev) => ({ ...prev, [purity]: data.rate.price }));
          } else {
            setSilverRate(data.rate.price);
          }
          onSuccess();
          toast.success(`${metal.toUpperCase()} ${purity ?? ''} rate updated to ₹${data.rate.price}`);
        } else {
          toast.error(`Failed to update ${metal} rate`);
        }
      })
      .catch(() => toast.error(`Error updating ${metal} rate`));
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

  return (
    <Layout>
      <h2 className="text-xl font-bold mb-6 text-yellow-700 flex items-center gap-2">
        <FaBoxOpen /> Dashboard Overview
      </h2>

      {/* Rates Section */}
      <div className="bg-white shadow rounded p-6 mb-6">
        <h4 className="text-md font-medium text-gray-700 mb-4">Today's Gold & Silver Rates</h4>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {(['24K', '22K', '18K'] as GoldPurity[]).map((purity) => {
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
                  updateRate('gold', rate, purity, () =>
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
              updateRate('silver', rate, null, () =>
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
          value={`₹ ${todaySales.toLocaleString('en-IN')}`}
          sub={`Compared to yesterday: ₹ ${salesDiff.toLocaleString('en-IN')} (${salesPercent}%)`}
          icon={<FaChartLine className="h-5 w-5 text-gray-400 absolute top-4 right-4" />}
        />
        <SummaryCard
          title="Items Sold Today"
          value={todayOrders.length.toString()}
          sub={`Compared to yesterday: ${yesterdayOrders.length} orders`}
          icon={<FaBoxOpen className="h-5 w-5 text-gray-400 absolute top-4 right-4" />}
        />
      </div>

      {/* Sales Chart */}
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Sales Trend Over Time</h3>
      <div className="bg-white shadow rounded p-4 mb-8 mx-auto">
        <div className="h-[300px]">
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
              maintainAspectRatio: false,
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
                x: {
                  ticks: {
                    autoSkip: true,
                    maxTicksLimit: 12,
                  },
                },
              },
            }}
          />
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

  return (
    <div className="bg-white shadow-xl sha rounded p-6 text-left relative">
            <FaRupeeSign className="h-5 w-5 text-gray-400 absolute top-4 right-4" />
      <h4 className="text-md font-medium text-gray-600 mb-2">{title}</h4>
      {edit ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="₹/g"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="border border-gray-300 p-2 rounded w-32 text-sm"
          />
          <button
            onClick={() => {
              const parsed = parseFloat(input);
              if (!isNaN(parsed)) {
                onApply(parsed);
              } else {
                toast.error('Please enter a valid number');
              }
            }}
            className="bg-yellow-600 text-white px-3 py-2 rounded text-sm hover:bg-yellow-700"
          >
            Apply
          </button>
        </div>
      ) : (
        <>
          <p className="text-xl font-bold text-yellow-700">
            ₹{rate?.toLocaleString('en-IN')} /g
          </p>
          <button
            onClick={handleEditClick}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <FaEdit /> Edit
          </button>
        </>
      )}
    </div>
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

  const labels = sortedMonths;
  const values = labels.map((m) => monthlyMap[m]);

  return { labels, values };
}

