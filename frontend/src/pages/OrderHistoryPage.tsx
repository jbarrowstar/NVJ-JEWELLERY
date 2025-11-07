import Layout from '../components/Layout';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  FaSearch,
  FaCalendarAlt,
  FaTimes,
  FaPrint,
  FaUndoAlt,
  FaReceipt,
  FaUser,
  FaBoxOpen
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import Fuse from 'fuse.js';
import { checkReturnExists } from '../services/returnService';
import { useReactToPrint } from 'react-to-print';
import InvoiceContent from '../components/InvoiceContent';

type Order = {
  _id: string;
  orderId?: string;
  invoiceNumber: string;
  date: string;
  time: string;
  customer: {
    name: string;
    phone: string;
    email: string;
  };
  items: {
    name: string;
    price: number;
    qty: number;
    sku: string;
  }[];
  discount?: number;
  tax?: number;
  grandTotal: number;
};

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnOrder, setReturnOrder] = useState<Order | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnType, setReturnType] = useState('');
  const [returnedOrderIds, setReturnedOrderIds] = useState<string[]>([]);
  const [fuse, setFuse] = useState<Fuse<Order> | null>(null);

  useEffect(() => {
    fetch('http://localhost:3001/api/orders')
      .then((res) => res.json())
      .then((data: { success: boolean; orders: Order[] }) => {
        if (data.success) {
          setOrders(data.orders);
          const fuseInstance = new Fuse(data.orders, {
            keys: ['orderId', 'invoiceNumber', 'customer.name'],
            threshold: 0.3,
            ignoreLocation: true,
            includeScore: true,
          });
          setFuse(fuseInstance);
        }
      })
      .catch((err) => console.error('Order fetch error:', err));

    fetch('http://localhost:3001/api/returns')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setReturnedOrderIds(data.returns.map((r: any) => r.orderId));
        }
      });
  }, []);

  const filteredByDate = orders.filter((order) => {
    if (!selectedDate) return true;
    const [day, month, year] = order.date.split('/');
    const normalized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    return normalized === selectedDate;
  });

  const filteredResults = (() => {
    if (!fuse) return filteredByDate;
    if (searchTerm.trim()) {
      const matches = fuse
        .search(searchTerm.trim())
        .filter((r) => r.score !== undefined && r.score <= 0.1)
        .map((r) => r.item);
      return matches.filter((order) => filteredByDate.includes(order));
    }
    return filteredByDate;
  })();

  const handleReturn = async (order: Order) => {
    try {
      const exists = await checkReturnExists(order._id.trim());
      if (exists) {
        toast.error('Return already processed for this order.');
        return;
      }
      setReturnOrder(order);
      setShowReturnModal(true);
    } catch (err) {
      console.error('Return check error:', err);
      toast.error('Server error while checking return status');
    }
  };

  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(
    useReactToPrint({
      contentRef: invoiceRef,
      documentTitle: `Invoice-${printOrder?.invoiceNumber || 'Nirvaha'}`,
      onAfterPrint: () => toast.success('Print completed'),
    }),
    [printOrder]
  );

  const getSubtotal = (order: Order | null) => {
    if (!order) return 0;
    return order.items.reduce((sum, item) => sum + item.price * item.qty, 0);
  };

  return (
    <>
    <Layout>
      <h2 className="text-xl font-bold mb-6 text-[#CC9200]">Order History</h2>

      {/* 🔍 Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex items-center border rounded px-3 py-2 w-full md:w-1/2">
          <FaSearch className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search by Order ID, Invoice or Customer"
            className="w-full outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center border rounded px-3 py-2 w-full md:w-1/2">
          <FaCalendarAlt className="text-gray-400 mr-2" />
          <input
            type="date"
            className="w-full outline-none"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {/* 📋 Orders Table */}
      <div className="bg-white rounded shadow-sm p-4">
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Order ID</th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Customer</th>
              <th className="p-2 text-center">Items</th>
              <th className="p-2 text-left">Invoice No</th>
              <th className="p-2 text-right">Total</th>
              <th className="p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-gray-500 py-4">
                  No matches found
                </td>
              </tr>
            ) : (
              filteredResults.map((order, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-2">{order.orderId || order._id}</td>
                  <td className="p-2">{order.date} {order.time}</td>
                  <td className="p-2">{order.customer.name}</td>
                  <td className="p-2 text-center">{order.items.length}</td>
                  <td className="p-2">{order.invoiceNumber}</td>
                  <td className="p-2 text-right">₹{order.grandTotal.toLocaleString()}</td>
                  <td className="p-2 text-center space-x-2">
                    <button
                      className="text-yellow-600 hover:text-yellow-700"
                      title="Print Invoice"
                      onClick={() => {
                        setPrintOrder(order); // ✅ use already-loaded order
                        setTimeout(() => handlePrint(), 300);
                      }}
                    >
                      <FaPrint />
                    </button>

                    <button
                      className={`text-red-600 ${
                        returnedOrderIds.includes(order.orderId || order._id)
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:text-red-700'
                      }`}
                      onClick={() =>
                        !returnedOrderIds.includes(order.orderId || order._id) &&
                        handleReturn(order)
                      }
                      title="Return Order"
                    >
                      <FaUndoAlt />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <p className="text-sm text-gray-500 mt-4">
          Showing {filteredResults.length} of {orders.length} orders
        </p>
      </div>

      {/* 🔁 Return Modal */}
      {showReturnModal && returnOrder && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#99A1AF]/90">
          <div className="bg-white rounded shadow-lg w-full max-w-2xl text-sm relative p-6">
            <button
              onClick={() => setShowReturnModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl"
              aria-label="Close"
            >
              <FaTimes />
            </button>

            <h2 className="text-xl font-semibold mb-6 text-center text-red-600">Return / Refund</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 border rounded p-4 space-y-2">
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <FaReceipt className="text-red-500" /> Return Info
                </h3>
                <p><strong>Return Date:</strong> {new Date().toLocaleDateString()}</p>
                <p><strong>Order ID:</strong> {returnOrder.orderId || returnOrder._id}</p>
                <p><strong>Invoice No:</strong> {returnOrder.invoiceNumber}</p>
                <p className="font-bold text-lg pt-2"><strong>Grand Total:</strong> ₹{returnOrder.grandTotal.toLocaleString()}</p>
              </div>
                            <div className="bg-gray-50 border rounded p-4 space-y-2">
                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <FaUser className="text-blue-500" /> Customer Info
                </h3>
                <p><strong>Name:</strong> {returnOrder.customer.name}</p>
                <p><strong>Phone:</strong> {returnOrder.customer.phone}</p>
                <p><strong>Email:</strong> {returnOrder.customer.email}</p>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Return Reason</label>
                    <select
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      className="w-full border p-2 rounded"
                    >
                      <option value="">Select Reason</option>
                      <option value="Damaged">Damaged</option>
                      <option value="Wrong Item">Wrong Item</option>
                      <option value="Customer Changed Mind">Customer Changed Mind</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Return Type</label>
                    <select
                      value={returnType}
                      onChange={(e) => setReturnType(e.target.value)}
                      className="w-full border p-2 rounded"
                    >
                      <option value="">Select Type</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="UPI">UPI</option>
                      <option value="Wallet">Wallet</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <FaBoxOpen className="text-green-600" /> Returned Items
              </h3>
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">Product</th>
                    <th className="p-2 text-right">Price</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {returnOrder.items.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2">{item.name}</td>
                      <td className="p-2 text-right">₹{item.price.toLocaleString()}</td>
                      <td className="p-2 text-center">{item.qty}</td>
                      <td className="p-2 text-right">₹{(item.price * item.qty).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ✅ Confirm Button */}
            <button
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded"
              onClick={async () => {
                if (!returnReason || !returnType) {
                  toast.error('Please select both reason and type.');
                  return;
                }

                if (returnOrder.items.length === 0 || returnOrder.grandTotal <= 0) {
                  toast.error('Invalid return data.');
                  return;
                }

                const returnData = {
                  orderId: returnOrder.orderId || returnOrder._id, // ✅ use formatted ID
                  invoiceNumber: returnOrder.invoiceNumber,
                  customer: returnOrder.customer,
                  items: returnOrder.items,
                  grandTotal: returnOrder.grandTotal,
                  returnReason,
                  returnType,
                  returnDate: new Date().toLocaleDateString(),
                  returnTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                };

                try {
                  const res = await fetch('http://localhost:3001/api/returns', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(returnData),
                  });
                  const data = await res.json();

                  if (data.success) {
                    toast.success(`Return confirmed for invoice ${returnOrder.invoiceNumber}`);
                    setShowReturnModal(false);
                    setReturnReason('');
                    setReturnType('');

                    const updatedReturns = await fetch('http://localhost:3001/api/returns').then(res => res.json());
                    if (updatedReturns.success) {
                      setReturnedOrderIds(updatedReturns.returns.map((r: any) => r.orderId));
                    }
                  } else {
                    toast.error(data.message || 'Failed to process return');
                  }
                } catch (err) {
                  console.error('Return error:', err);
                  toast.error('Server error');
                }
              }}
            >
              Confirm Return
            </button>
          </div>
        </div>
      )}
    </Layout>

    {/* ✅ Hidden printable layout */}
      {printOrder && (
        <div className="hidden">
          <InvoiceContent
            ref={invoiceRef}
            order={printOrder}
            subtotal={getSubtotal(printOrder)}
            grandTotal={printOrder.grandTotal}
          />
        </div>
      )}

    </>
  );
}
