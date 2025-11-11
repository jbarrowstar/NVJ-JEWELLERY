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
import { fetchOrders, type Order } from '../services/orderService';
import { fetchProducts, type Product } from '../services/productService';

ChartJS.register(LineElement, BarElement, ArcElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

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
        
        const [ordersData, allProducts] = await Promise.all([
          fetchOrders(),
          fetchProducts()
        ]);

        if (!ordersData.success || !Array.isArray(ordersData.orders)) {
          console.error('Invalid orders data');
          return;
        }

        const allOrders: Order[] = ordersData.orders;

        // Create product map for cost lookup
        const productMap = new Map(allProducts.map(p => [p.sku, p]));

        // Calculate current and previous period data
        const { currentOrders, previousOrders } = filterOrdersByTimeRange(allOrders, timeRange);
        
        // Calculate all metrics
        const currentMetrics = calculateMetrics(currentOrders, productMap);
        const previousMetrics = calculateMetrics(previousOrders, productMap);
        
        setMetrics(currentMetrics);
        setPreviousMetrics(previousMetrics);
        
        // Get only 5 most recent transactions
        const recentTransactions = currentOrders
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);
        setTransactions(recentTransactions);

        // Calculate trends
        const trendData = calculateSalesTrend(currentOrders, productMap, timeRange);
        setSalesTrend(trendData);

        // Payment methods
        const paymentData = calculatePaymentMethods(currentOrders);
        setPaymentMethods(paymentData);

        // Metal sales (revenue only, no profit)
        const metalData = calculateMetalSales(currentOrders, productMap);
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

    // Reset time to start of day for proper date comparison
    currentCutoff.setHours(0, 0, 0, 0);
    previousCutoff.setHours(0, 0, 0, 0);
    now.setHours(23, 59, 59, 999);

    const currentOrders = orders.filter(order => {
      try {
        const orderDate = new Date(order.createdAt);
        return orderDate >= currentCutoff && orderDate <= now;
      } catch {
        return false;
      }
    });
    
    const previousOrders = orders.filter(order => {
      try {
        const orderDate = new Date(order.createdAt);
        return orderDate >= previousCutoff && orderDate < currentCutoff;
      } catch {
        return false;
      }
    });

    return { currentOrders, previousOrders };
  };

  const calculateMetrics = (orders: Order[], productMap: Map<string, Product>) => {
    if (orders.length === 0) {
      return {
        revenue: 0,
        profit: 0,
        profitMargin: 0,
        avgTransaction: 0,
        itemsSold: 0,
        totalOrders: 0,
        totalCustomers: 0,
        refunds: 0,
        successRate: 100,
      };
    }

    const totalRevenue = orders.reduce((sum, order) => sum + order.grandTotal, 0);
    const totalItems = orders.reduce(
      (sum, order) => sum + order.items.reduce((iSum, item) => iSum + item.qty, 0),
      0
    );

    // Calculate profit using actual cost prices or fallback to 40% margin
    const profitData = orders.reduce((acc, order) => {
      const orderProfit = order.items.reduce((itemAcc, item) => {
        const product = productMap.get(item.sku);
        // Use actual cost price if available, otherwise use 40% margin (60% cost)
        const costPrice = product?.costPrice || item.price * 0.6;
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
      profitMargin: parseFloat(profitMargin.toFixed(1)),
      avgTransaction: Math.round(avgTransaction),
      itemsSold: totalItems,
      totalOrders: orders.length,
      totalCustomers: uniqueCustomers.size,
      refunds: refundedOrders.length,
      successRate: Math.round(successRate),
    };
  };

  const calculateSalesTrend = (orders: Order[], productMap: Map<string, Product>, range: TimeRange) => {
    if (orders.length === 0) {
      return { labels: [], revenue: [], itemsSold: [], orders: [], profit: [] };
    }

    const formatMap: Record<TimeRange, Intl.DateTimeFormatOptions> = {
      '7days': { day: 'numeric', month: 'short' },
      '30days': { day: 'numeric', month: 'short' },
      '90days': { month: 'short', day: 'numeric' },
      '1year': { month: 'short', year: 'numeric' }
    };

    const grouped = orders.reduce((acc, order) => {
      try {
        const date = new Date(order.createdAt);
        const label = date.toLocaleDateString('en-IN', formatMap[range]);
        
        if (!acc[label]) {
          acc[label] = { revenue: 0, items: 0, orders: 0, profit: 0 };
        }
        
        // Calculate order profit
        const orderProfit = order.items.reduce((profit, item) => {
          const product = productMap.get(item.sku);
          const costPrice = product?.costPrice || item.price * 0.6;
          return profit + (item.price - costPrice) * item.qty;
        }, 0);
        
        acc[label].revenue += order.grandTotal;
        acc[label].items += order.items.reduce((sum, item) => sum + item.qty, 0);
        acc[label].orders += 1;
        acc[label].profit += orderProfit;
      } catch (error) {
        console.error('Error processing order for trend:', error);
      }
      
      return acc;
    }, {} as Record<string, { revenue: number; items: number; orders: number; profit: number }>);

    const labels = Object.keys(grouped);
    const revenue = labels.map(label => Math.round(grouped[label].revenue));
    const itemsSold = labels.map(label => grouped[label].items);
    const ordersCount = labels.map(label => grouped[label].orders);
    const profit = labels.map(label => Math.round(grouped[label].profit));

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

    return Array.from(paymentMap.entries())
      .map(([method, data]) => ({
        method,
        amount: Math.round(data.amount),
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount); // Sort by amount descending
  };

const calculateMetalSales = (orders: Order[], productMap: Map<string, Product>) => {
  const metalMap = new Map<string, { revenue: number; items: number }>();
  
  orders.forEach(order => {
    order.items.forEach(item => {
      const product = productMap.get(item.sku);
      // Use product metal if available and valid, otherwise determine from context
      let metal: string;
      
      if (product?.metal && (product.metal === 'gold' || product.metal === 'silver')) {
        metal = product.metal;
      } else {
        // Try to extract metal from category or product name
        const category = product?.category?.toLowerCase() || '';
        const name = product?.name?.toLowerCase() || item.name.toLowerCase();
        
        if (category.includes('gold') || name.includes('gold')) {
          metal = 'gold';
        } else if (category.includes('silver') || name.includes('silver')) {
          metal = 'silver';
        } else {
          metal = 'other';
        }
      }
      
      if (!metalMap.has(metal)) {
        metalMap.set(metal, { revenue: 0, items: 0 });
      }
      const data = metalMap.get(metal)!;
      data.revenue += item.price * item.qty;
      data.items += item.qty;
    });
  });

  // Convert to array and sort by revenue (highest first)
  const metalData = Array.from(metalMap.entries()).map(([metal, data]) => {
    // Properly capitalize metal names
    const metalName = metal === 'gold' ? 'Gold' : 
                     metal === 'silver' ? 'Silver' : 'Other';
      
    return {
      metal: metalName,
      revenue: Math.round(data.revenue),
      items: data.items,
    };
  });

  // Sort by revenue descending
  return metalData.sort((a, b) => b.revenue - a.revenue);
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
        <h2 className="text-xl text-yellow-700">Reports & Analytics</h2>
        
        {/* Time Range Filter */}
        <select 
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as TimeRange)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
        >
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="90days">Last 90 Days</option>
          <option value="1year">Last Year</option>
        </select>
      </div>

      {/* Summary Metrics */}
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sales & Profit Trend */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg text-gray-800 mb-4">Sales & Profit Trend</h3>
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

        {/* Payment Methods */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg text-gray-800 mb-4">Payment Methods</h3>
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
                <span className="text-sm">
                  ₹{method.amount.toLocaleString()} ({method.count} orders)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Metal Sales Analysis */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg text-gray-800 mb-4">Metal Sales Analysis</h3>
          <div className="space-y-4">
            {metalSales.length > 0 ? (
              metalSales.map((metal) => {
                const totalRevenue = metalSales.reduce((sum, m) => sum + m.revenue, 0);
                const percentage = totalRevenue > 0 ? (metal.revenue / totalRevenue) * 100 : 0;
                
                return (
                  <div key={metal.metal} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-base">{metal.metal}</span>
                      <span className="text-sm text-gray-600">
                        {metal.items} items • ₹{metal.revenue.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: metal.metal === 'Gold' ? '#d4af37' : 
                                         metal.metal === 'Silver' ? '#c0c0c0' : '#cd7f32',
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 text-right">
                      {percentage.toFixed(1)}% of total revenue
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-gray-500 py-3 text-base">
                No metal sales data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions - Only 5 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg text-gray-800">Recent Sales Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-4 text-left text-gray-700">Order ID</th>
                <th className="p-4 text-left text-gray-700">Date & Time</th>
                <th className="p-4 text-left text-gray-700">Customer</th>
                <th className="p-4 text-left text-gray-700">Items</th>
                <th className="p-4 text-left text-gray-700">Payment</th>
                <th className="p-4 text-left text-gray-700">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.length > 0 ? (
                transactions.map((txn) => (
                  <tr key={txn._id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="p-4">{txn.orderId}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <span>{txn.date}</span>
                        <span className="text-gray-400">|</span>
                        <span>{txn.time}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>{txn.customer?.name || '—'}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-xs">
                        {txn.items.length}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="capitalize">{txn.paymentMode}</span>
                    </td>
                    <td className="p-4 text-green-600">
                      ₹{txn.grandTotal.toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow duration-150">
      <div className="flex justify-between items-start mb-2">
        <span className="text-2xl">{icon}</span>
        <span className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {trend}
        </span>
      </div>
      <h4 className="text-sm text-gray-600 mb-1">{title}</h4>
      <p className="text-xl text-gray-900">{value}</p>
    </div>
  );
}