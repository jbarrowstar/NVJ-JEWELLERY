import Layout from '../components/Layout';
import { useEffect, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(LineElement, BarElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

type OrderItem = {
  name: string;
  price: number;
  qty: number;
  sku: string;
  category?: string;
};

type Order = {
  _id: string;
  orderId: string;
  invoiceNumber: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  paymentMode: string;
  subtotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
  date: string;
  time: string;
  items: OrderItem[];
  createdAt: string;
};

type CategoryMargin = {
  category: string;
  margin: number;
};

export default function AdminReportsPage() {
  const [metrics, setMetrics] = useState({
    revenue: 0,
    profitMargin: 0,
    avgTransaction: 0,
    itemsSold: 0,
  });

  const [salesTrend, setSalesTrend] = useState<{
    labels: string[];
    revenue: number[];
    itemsSold: number[];
  }>({
    labels: [],
    revenue: [],
    itemsSold: [],
  });

  const [categoryMargins, setCategoryMargins] = useState<CategoryMargin[]>([]);
  const [transactions, setTransactions] = useState<Order[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:3001/api/orders').then((res) => res.json()),
      fetch('http://localhost:3001/api/categories').then((res) => res.json()),
    ])
      .then(([orderData, categoryData]) => {
        if (!orderData.success || !Array.isArray(orderData.orders)) return;
        if (!categoryData.success || !Array.isArray(categoryData.categories)) return;

        const orders: Order[] = orderData.orders;
        setTransactions(orders.slice(0, 10));

        const totalRevenue = orders.reduce((sum, o) => sum + o.grandTotal, 0);
        const totalItems = orders.reduce(
          (sum, o) => sum + o.items.reduce((iSum, i) => iSum + i.qty, 0),
          0
        );
        const avgTransaction = orders.length ? Math.round(totalRevenue / orders.length) : 0;

        setMetrics({
          revenue: totalRevenue,
          profitMargin: 33,
          avgTransaction,
          itemsSold: totalItems,
        });

        // 📈 Group by month-year using createdAt
        const monthlyMap: Record<string, { revenue: number; items: number }> = {};
        orders.forEach((o) => {
          const date = new Date(o.createdAt);
          const label = date.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
          if (!monthlyMap[label]) monthlyMap[label] = { revenue: 0, items: 0 };
          monthlyMap[label].revenue += o.grandTotal;
          monthlyMap[label].items += o.items.reduce((sum, i) => sum + i.qty, 0);
        });

        const sortedLabels = Object.keys(monthlyMap).sort((a, b) => {
          const [aMonth, aYear] = a.split(' ');
          const [bMonth, bYear] = b.split(' ');
          return new Date(`${aMonth} 1, ${aYear}`).getTime() - new Date(`${bMonth} 1, ${bYear}`).getTime();
        });

        const revenue = sortedLabels.map((l) => monthlyMap[l].revenue);
        const itemsSold = sortedLabels.map((l) => monthlyMap[l].items);
        setSalesTrend({ labels: sortedLabels, revenue, itemsSold });

        const margins: CategoryMargin[] = categoryData.categories.map((cat: { name: string; productCount: number }) => ({
          category: cat.name,
          margin: Math.min(100, Math.round(cat.productCount * 2.5)),
        }));

        setCategoryMargins(margins);
      })
      .catch((err) => console.error('Report fetch error:', err));
  }, []);

  return (
    <Layout>
      <h2 className="text-xl font-bold mb-6 text-yellow-700">Reports & Analytics</h2>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <MetricCard title="Total Revenue" value={`₹ ${metrics.revenue.toLocaleString()}`} />
        <MetricCard title="Profit Margin" value={`${metrics.profitMargin}%`} sub="Estimated" />
        <MetricCard title="Avg. Transaction Value" value={`₹ ${metrics.avgTransaction.toLocaleString()}`} />
        <MetricCard title="Items Sold" value={metrics.itemsSold.toString()} />
      </div>

      {/* Charts Side by Side */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="bg-white rounded shadow p-4 w-full md:w-1/2">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Sales Trend Over Time</h3>
          <Line
            data={{
              labels: salesTrend.labels,
              datasets: [
                {
                  label: 'Revenue',
                  data: salesTrend.revenue,
                  borderColor: '#CC9200',
                  backgroundColor: 'rgba(204,146,0,0.2)',
                  tension: 0.3,
                },
                {
                  label: 'Items Sold',
                  data: salesTrend.itemsSold,
                  borderColor: '#4B5563',
                  backgroundColor: 'rgba(75,85,99,0.2)',
                  tension: 0.3,
                },
              ],
            }}
            options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }}
          />
        </div>

        <div className="bg-white rounded shadow p-4 w-full md:w-1/2">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Profit Margin by Category</h3>
          <Bar
            data={{
              labels: categoryMargins.map((c) => c.category),
              datasets: [
                {
                  label: 'Profit Margin (%)',
                  data: categoryMargins.map((c) => c.margin),
                  backgroundColor: '#CC9200',
                },
              ],
            }}
            options={{ responsive: true, plugins: { legend: { display: false } } }}
          />
        </div>
      </div>

      {/* Recent Transactions */}
      <h3 className="text-lg font-semibold text-gray-700 mb-2">Recent Sales Transactions</h3>
      <div className="bg-white rounded shadow p-4 mb-8 overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Transaction ID</th>
              <th className="p-2 text-left">Customer Name</th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Amount</th>
              <th className="p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((txn) => (
              <tr key={txn._id} className="border-t">
                <td className="p-2">{txn.orderId}</td>
                <td className="p-2">{txn.customer?.name || '—'}</td>
                <td className="p-2">{txn.date}</td>
                <td className="p-2">₹{txn.grandTotal.toLocaleString()}</td>
                <td className="p-2">
                  <span className="text-xs font-semibold text-green-600">Completed</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

function MetricCard({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="bg-white shadow rounded p-4 text-left">
            <h4 className="text-sm font-medium text-gray-600 mb-1">{title}</h4>
      <p className="text-xl font-bold text-yellow-700">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}
