import Layout from '../components/Layout';
import { useEffect, useState } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(LineElement, BarElement, ArcElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

type OrderItem = {
  name: string;
  price: number;
  qty: number;
  sku: string;
  category?: string;
  metal?: string;
  costPrice?: number;
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
  status: 'completed' | 'refunded' | 'cancelled';
};

type Product = {
  _id: string;
  sku: string;
  name: string;
  costPrice: number;
  price: number;
  category: string;
  metal: string;
};

type TimeRange = '7days' | '30days' | '90days' | '1year';

export default function AdminReportsPage() {
  const [metrics, setMetrics] = useState({
    revenue: 0,
    profit: 0,
    profitMargin: 0,
    avgTransaction: 0,
    itemsSold: 0,
    totalOrders: 0,
    totalCustomers: 0,
    refunds: 0,
    successRate: 100,
  });

  const [previousMetrics, setPreviousMetrics] = useState({
    revenue: 0,
    profit: 0,
    profitMargin: 0,
    avgTransaction: 0,
    itemsSold: 0,
    totalOrders: 0,
    totalCustomers: 0,
    refunds: 0,
    successRate: 100,
  });

  const [salesTrend, setSalesTrend] = useState<{
    labels: string[];
    revenue: number[];
    itemsSold: number[];
    orders: number[];
    profit: number[];
  }>({
    labels: [],
    revenue: [],
    itemsSold: [],
    orders: [],
    profit: [],
  });

  const [paymentMethods, setPaymentMethods] = useState<{ method: string; amount: number; count: number }[]>([]);
  const [metalSales, setMetalSales] = useState<{ metal: string; revenue: number; items: number }[]>([]);
  const [transactions, setTransactions] = useState<Order[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('30days');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        
        const [ordersRes, productsRes] = await Promise.all([
          fetch('http://localhost:3001/api/orders'),
          fetch('http://localhost:3001/api/products')
        ]);

        const ordersData = await ordersRes.json();
        const productsData = await productsRes.json();

        if (!ordersData.success || !Array.isArray(ordersData.orders)) {
          console.error('Invalid orders data');
          return;
        }

        const allOrders: Order[] = ordersData.orders;
        const allProducts: Product[] = productsData.products || productsData.data || [];

        // Create product map for cost lookup
        const productMap = new Map(allProducts.map(p => [p.sku, p]));

        // Calculate current and previous period data
        const { currentOrders, previousOrders } = filterOrdersByTimeRange(allOrders, timeRange);
        
        // Calculate all metrics
        const currentMetrics = calculateMetrics(currentOrders, productMap);
        const previousMetrics = calculateMetrics(previousOrders, productMap);
        
        setMetrics(currentMetrics);
        setPreviousMetrics(previousMetrics);
        setTransactions(currentOrders.slice(0, 10));

        // Calculate trends
        const trendData = calculateSalesTrend(currentOrders, productMap, timeRange);
        setSalesTrend(trendData);

        // Payment methods
        const paymentData = calculatePaymentMethods(currentOrders);
        setPaymentMethods(paymentData);

        // Metal sales (revenue only, no profit)
        const metalData = calculateMetalSales(currentOrders);
        setMetalSales(metalData);

      } catch (err) {
        console.error('Report fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [timeRange]);

  const filterOrdersByTimeRange = (orders: Order[], range: TimeRange) => {
    const now = new Date();
    const currentCutoff = new Date();
    const previousCutoff = new Date();

    switch (range) {
      case '7days':
        currentCutoff.setDate(now.getDate() - 7);
        previousCutoff.setDate(now.getDate() - 14);
        break;
      case '30days':
        currentCutoff.setDate(now.getDate() - 30);
        previousCutoff.setDate(now.getDate() - 60);
        break;
      case '90days':
        currentCutoff.setDate(now.getDate() - 90);
        previousCutoff.setDate(now.getDate() - 180);
        break;
      case '1year':
        currentCutoff.setFullYear(now.getFullYear() - 1);
        previousCutoff.setFullYear(now.getFullYear() - 2);
        break;
      default:
        return { currentOrders: orders, previousOrders: [] };
    }

    const currentOrders = orders.filter(order => 
      new Date(order.createdAt) >= currentCutoff && new Date(order.createdAt) <= now
    );
    
    const previousOrders = orders.filter(order => 
      new Date(order.createdAt) >= previousCutoff && new Date(order.createdAt) < currentCutoff
    );

    return { currentOrders, previousOrders };
  };

  const calculateMetrics = (orders: Order[], productMap: Map<string, Product>) => {
    const totalRevenue = orders.reduce((sum, order) => sum + order.grandTotal, 0);
    const totalItems = orders.reduce(
      (sum, order) => sum + order.items.reduce((iSum, item) => iSum + item.qty, 0),
      0
    );

    // Calculate profit using 25% margin
    const profitData = orders.reduce((acc, order) => {
      const orderProfit = order.items.reduce((itemAcc, item) => {
        const product = productMap.get(item.sku);
        // Use 25% margin instead of 40%
        const costPrice = product?.costPrice || item.price * 0.75;
        const itemRevenue = item.price * item.qty;
        const itemCost = costPrice * item.qty;
        const itemProfit = itemRevenue - itemCost;
        
        return {
          cost: itemAcc.cost + itemCost,
          profit: itemAcc.profit + itemProfit
        };
      }, { cost: 0, profit: 0 });

      return {
        cost: acc.cost + orderProfit.cost,
        profit: acc.profit + orderProfit.profit
      };
    }, { cost: 0, profit: 0 });

    const profitMargin = totalRevenue > 0 ? (profitData.profit / totalRevenue) * 100 : 0;
    const avgTransaction = orders.length ? totalRevenue / orders.length : 0;
    
    // Get unique customers
    const uniqueCustomers = new Set(orders.map(o => o.customer.phone));
    
    // Calculate refunds and success rate
    const refundedOrders = orders.filter(o => o.status === 'refunded' || o.status === 'cancelled');
    const successRate = orders.length > 0 
      ? ((orders.length - refundedOrders.length) / orders.length) * 100 
      : 100;

    return {
      revenue: Math.round(totalRevenue),
      profit: Math.round(profitData.profit),
      profitMargin: Math.round(profitMargin),
      avgTransaction: Math.round(avgTransaction),
      itemsSold: totalItems,
      totalOrders: orders.length,
      totalCustomers: uniqueCustomers.size,
      refunds: refundedOrders.length,
      successRate: Math.round(successRate),
    };
  };

  const calculateSalesTrend = (orders: Order[], productMap: Map<string, Product>, range: TimeRange) => {
    const formatMap: Record<TimeRange, Intl.DateTimeFormatOptions> = {
      '7days': { day: 'numeric', month: 'short' },
      '30days': { day: 'numeric', month: 'short' },
      '90days': { month: 'short', day: 'numeric' },
      '1year': { month: 'short', year: 'numeric' }
    };

    const grouped = orders.reduce((acc, order) => {
      const date = new Date(order.createdAt);
      const label = date.toLocaleDateString('en-IN', formatMap[range]);
      
      if (!acc[label]) {
        acc[label] = { revenue: 0, items: 0, orders: 0, profit: 0 };
      }
      
      // Calculate order profit with 25% margin
      const orderProfit = order.items.reduce((profit, item) => {
        const product = productMap.get(item.sku);
        const costPrice = product?.costPrice || item.price * 0.75;
        return profit + (item.price - costPrice) * item.qty;
      }, 0);
      
      acc[label].revenue += order.grandTotal;
      acc[label].items += order.items.reduce((sum, item) => sum + item.qty, 0);
      acc[label].orders += 1;
      acc[label].profit += orderProfit;
      
      return acc;
    }, {} as Record<string, { revenue: number; items: number; orders: number; profit: number }>);

    const labels = Object.keys(grouped);
    const revenue = labels.map(label => grouped[label].revenue);
    const itemsSold = labels.map(label => grouped[label].items);
    const ordersCount = labels.map(label => grouped[label].orders);
    const profit = labels.map(label => grouped[label].profit);

    return { labels, revenue, itemsSold, orders: ordersCount, profit };
  };

  const calculatePaymentMethods = (orders: Order[]) => {
    const paymentMap = new Map();
    
    orders.forEach(order => {
      const method = order.paymentMode || 'Unknown';
      if (!paymentMap.has(method)) {
        paymentMap.set(method, { amount: 0, count: 0 });
      }
      const data = paymentMap.get(method);
      data.amount += order.grandTotal;
      data.count += 1;
    });

    return Array.from(paymentMap.entries()).map(([method, data]) => ({
      method,
      amount: data.amount,
      count: data.count,
    }));
  };

  const calculateMetalSales = (orders: Order[]) => {
    const metalMap = new Map();
    
    orders.forEach(order => {
      order.items.forEach(item => {
        const metal = (item.metal || 'Other').toLowerCase();
        
        if (!metalMap.has(metal)) {
          metalMap.set(metal, { revenue: 0, items: 0 });
        }
        const data = metalMap.get(metal);
        data.revenue += item.price * item.qty;
        data.items += item.qty;
      });
    });

    return Array.from(metalMap.entries()).map(([metal, data]) => {
      const metalName = metal && typeof metal === 'string' 
        ? metal.charAt(0).toUpperCase() + metal.slice(1)
        : 'Other';
        
      return {
        metal: metalName,
        revenue: data.revenue,
        items: data.items,
      };
    });
  };

  const calculateTrend = (current: number, previous: number): string => {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const change = ((current - previous) / previous) * 100;
    return `${change >= 0 ? '+' : ''}${Math.round(change)}%`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">Loading reports...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-yellow-700">Reports & Analytics</h2>
        
        {/* Time Range Filter */}
        <select 
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as TimeRange)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
          <option value="1year">Last Year</option>
        </select>
      </div>

      {/* Summary Metrics - Medium Size */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard 
          title="Total Revenue" 
          value={`₹${metrics.revenue.toLocaleString()}`}
          trend={calculateTrend(metrics.revenue, previousMetrics.revenue)}
          icon="💰"
        />
        <MetricCard 
          title="Total Profit" 
          value={`₹${metrics.profit.toLocaleString()}`}
          trend={calculateTrend(metrics.profit, previousMetrics.profit)}
          icon="💎"
        />
        <MetricCard 
          title="Profit Margin" 
          value={`${metrics.profitMargin}%`}
          trend={calculateTrend(metrics.profitMargin, previousMetrics.profitMargin)}
          icon="📈"
        />
        <MetricCard 
          title="Orders" 
          value={metrics.totalOrders.toString()}
          trend={calculateTrend(metrics.totalOrders, previousMetrics.totalOrders)}
          icon="📦"
        />
        <MetricCard 
          title="Avg. Order Value" 
          value={`₹${metrics.avgTransaction.toLocaleString()}`}
          trend={calculateTrend(metrics.avgTransaction, previousMetrics.avgTransaction)}
          icon="📊"
        />
        <MetricCard 
          title="Items Sold" 
          value={metrics.itemsSold.toString()}
          trend={calculateTrend(metrics.itemsSold, previousMetrics.itemsSold)}
          icon="🛍️"
        />
        <MetricCard 
          title="Customers" 
          value={metrics.totalCustomers.toString()}
          trend={calculateTrend(metrics.totalCustomers, previousMetrics.totalCustomers)}
          icon="👥"
        />
        <MetricCard 
          title="Success Rate" 
          value={`${metrics.successRate}%`}
          trend={calculateTrend(metrics.successRate, previousMetrics.successRate)}
          icon="✅"
        />
      </div>

      {/* Charts Grid - Medium Size */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sales & Profit Trend - Medium */}
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Sales & Profit Trend</h3>
          <div className="h-64">
            <Line
              data={{
                labels: salesTrend.labels,
                datasets: [
                  {
                    label: 'Revenue (₹)',
                    data: salesTrend.revenue,
                    borderColor: '#d4af37',
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    tension: 0.4,
                    fill: true,
                  },
                  {
                    label: 'Profit (₹)',
                    data: salesTrend.profit,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                  },
                ],
              }}
              options={{ 
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                  legend: { 
                    position: 'top',
                    labels: {
                      boxWidth: 14,
                      font: {
                        size: 12
                      }
                    }
                  } 
                },
                scales: {
                  x: {
                    ticks: {
                      font: {
                        size: 11
                      }
                    }
                  },
                  y: {
                    ticks: {
                      font: {
                        size: 11
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Payment Methods - Medium */}
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment Methods</h3>
          <div className="h-64">
            <Doughnut
              data={{
                labels: paymentMethods.map(p => p.method),
                datasets: [
                  {
                    data: paymentMethods.map(p => p.amount),
                    backgroundColor: [
                      '#d4af37',
                      '#4f46e5',
                      '#10b981',
                      '#ef4444',
                      '#8b5cf6',
                      '#f59e0b',
                    ],
                    borderWidth: 2,
                    borderColor: '#fff',
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      boxWidth: 12,
                      font: {
                        size: 11
                      }
                    }
                  },
                },
              }}
            />
          </div>
          <div className="mt-4 space-y-2">
            {paymentMethods.map((method, index) => (
              <div key={method.method} className="flex justify-between items-center text-sm">
                <span className="flex items-center">
                  <span
                    className="w-3 h-3 rounded-full mr-2"
                    style={{
                      backgroundColor: [
                        '#d4af37',
                        '#4f46e5',
                        '#10b981',
                        '#ef4444',
                        '#8b5cf6',
                        '#f59e0b',
                      ][index % 6],
                    }}
                  ></span>
                  {method.method}
                </span>
                <span className="font-semibold text-sm">
                  ₹{method.amount.toLocaleString()} ({method.count} orders)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Metal Sales Analysis - Medium */}
        <div className="bg-white rounded-lg shadow p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Metal Sales Analysis</h3>
          <div className="space-y-4">
            {metalSales.length > 0 ? (
              metalSales.map((metal, index) => (
                <div key={metal.metal} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-base">{metal.metal}</span>
                    <span className="text-sm text-gray-600">
                      {metal.items} items • ₹{Math.round(metal.revenue).toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${(metal.revenue / Math.max(1, ...metalSales.map(m => m.revenue))) * 100}%`,
                        backgroundColor: ['#d4af37', '#c0c0c0', '#cd7f32', '#b87333'][index % 4],
                      }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-3 text-base">
                No metal sales data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions - Medium */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-5 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Recent Sales Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4 text-left font-medium text-gray-600">Order ID</th>
                <th className="p-4 text-left font-medium text-gray-600">Customer</th>
                <th className="p-4 text-left font-medium text-gray-600">Date</th>
                <th className="p-4 text-left font-medium text-gray-600">Items</th>
                <th className="p-4 text-left font-medium text-gray-600">Payment</th>
                <th className="p-4 text-left font-medium text-gray-600">Amount</th>
                <th className="p-4 text-left font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.length > 0 ? (
                transactions.map((txn) => {
                  return (
                    <tr key={txn._id} className="hover:bg-gray-50">
                      <td className="p-4 font-mono text-xs">{txn.orderId}</td>
                      <td className="p-4">
                        <div>
                          <div className="font-medium text-sm">{txn.customer?.name || '—'}</div>
                          <div className="text-gray-500 text-xs">{txn.customer?.phone}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-xs">
                          <div>{txn.date}</div>
                          <div className="text-gray-500">{txn.time}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-xs">
                          {txn.items.length} items
                          <div className="text-gray-500">
                            {txn.items.slice(0, 2).map(item => item.name).join(', ')}
                            {txn.items.length > 2 && '...'}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          txn.paymentMode === 'Cash' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {txn.paymentMode}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-sm">₹{txn.grandTotal.toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          txn.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : txn.status === 'refunded'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {txn.status ? txn.status.charAt(0).toUpperCase() + txn.status.slice(1) : 'Unknown'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-gray-500 text-sm">
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}

function MetricCard({ title, value, trend, icon }: { 
  title: string; 
  value: string; 
  trend: string;
  icon: string;
}) {
  const isPositive = !trend.startsWith('-');
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
      <div className="flex justify-between items-start mb-2">
        <span className="text-2xl">{icon}</span>
        <span className={`text-xs font-medium ${
          isPositive ? 'text-green-600' : 'text-red-600'
        }`}>
          {trend}
        </span>
      </div>
      <h4 className="text-sm font-medium text-gray-600 mb-1">{title}</h4>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}