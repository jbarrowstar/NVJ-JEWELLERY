import Layout from '../components/Layout';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  FaSearch,
  FaCalendarAlt,
  FaTimes,
  FaPrint,
  FaUndoAlt,
  FaHistory,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import Fuse from 'fuse.js';
import { checkReturnExists } from '../services/returnService';
import { fetchOrders } from '../services/orderService';
import { fetchReturns, createReturn } from '../services/returnService';
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
  paymentMode?: string;
  paymentMethods?: Array<{
    method: string;
    amount: number;
  }>;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [checkingReturn, setCheckingReturn] = useState<string | null>(null);
  const itemsPerPage = 30;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const ordersData = await fetchOrders();
        if (ordersData.success) {
          setOrders(ordersData.orders);
          const fuseInstance = new Fuse(ordersData.orders, {
            keys: ['orderId', 'invoiceNumber', 'customer.name', 'customer.phone'],
            threshold: 0.3,
            ignoreLocation: true,
            includeScore: true,
          });
          setFuse(fuseInstance);
        }

        const returnsData = await fetchReturns();
        if (returnsData.success) {
          setReturnedOrderIds(returnsData.returns.map((r: any) => r.orderId));
        }
      } catch (err) {
        console.error('Data fetch error:', err);
        toast.error('Failed to load order data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredByDate = useMemo(() => orders.filter((order) => {
    if (!selectedDate) return true;
    const [day, month, year] = order.date.split('/');
    const normalized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    return normalized === selectedDate;
  }), [orders, selectedDate]);

  const filteredResults = useMemo(() => {
    if (!fuse) return filteredByDate;
    if (searchTerm.trim()) {
      const matches = fuse
        .search(searchTerm.trim())
        .filter((r) => r.score !== undefined && r.score <= 0.1)
        .map((r) => r.item);
      return matches.filter((order) => filteredByDate.includes(order));
    }
    return filteredByDate;
  }, [fuse, searchTerm, filteredByDate]);

  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredResults.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredResults, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDate]);

  const handleReturn = async (order: Order) => {
    const orderId = order.orderId || order._id;
    
    try {
      setCheckingReturn(orderId);
      
      // Check if return already exists
      const returnExists = await checkReturnExists(orderId);
      
      if (returnExists) {
        toast.error('Return already processed for this order.');
        return;
      }
      
      setReturnOrder(order);
      setShowReturnModal(true);
    } catch (err) {
      console.error('Return check error:', err);
      // Even if check fails, allow user to proceed with return
      toast.error('Unable to verify return status. Proceeding with return...');
      setReturnOrder(order);
      setShowReturnModal(true);
    } finally {
      setCheckingReturn(null);
    }
  };

  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(
    useReactToPrint({
      contentRef: invoiceRef,
      documentTitle: `Invoice-${printOrder?.invoiceNumber || 'Nirvaha'}`,
      onAfterPrint: () => toast.success('Invoice printed successfully'),
    }),
    [printOrder]
  );

  const getSubtotal = (order: Order | null) => {
    if (!order) return 0;
    return order.items.reduce((sum, item) => sum + item.price * item.qty, 0);
  };

  const getPaymentType = (order: Order) => {
    if (order.paymentMethods && order.paymentMethods.length > 0) {
      if (order.paymentMethods.length === 1) {
        return order.paymentMethods[0].method;
      }
      return 'Multiple';
    }
    return order.paymentMode || '—';
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    buttons.push(
      <button
        key="prev"
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 border border-gray-300 rounded-l-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center gap-1 text-gray-600 transition-colors duration-150"
      >
        <FaChevronLeft className="text-xs" />
      </button>
    );

    for (let page = startPage; page <= endPage; page++) {
      buttons.push(
        <button
          key={page}
          onClick={() => goToPage(page)}
          className={`px-3 py-2 border-t border-b border-gray-300 transition-colors duration-150 ${
            currentPage === page
              ? 'bg-yellow-600 text-white border-yellow-600'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          {page}
        </button>
      );
    }

    buttons.push(
      <button
        key="next"
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 border border-gray-300 rounded-r-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center gap-1 text-gray-600 transition-colors duration-150"
      >
        <FaChevronRight className="text-xs" />
      </button>
    );

    return buttons;
  };

  const processReturn = async () => {
    if (!returnOrder) return;

    if (!returnReason || !returnType) {
      toast.error('Please select both reason and type.');
      return;
    }

    if (returnOrder.items.length === 0 || returnOrder.grandTotal <= 0) {
      toast.error('Invalid return data.');
      return;
    }

    const returnData = {
      orderId: returnOrder.orderId || returnOrder._id,
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
      const data = await createReturn(returnData);

      if (data.success) {
        toast.success(`Return confirmed for invoice ${returnOrder.invoiceNumber}`);
        setShowReturnModal(false);
        setReturnReason('');
        setReturnType('');

        // Update returned order IDs
        setReturnedOrderIds(prev => [...prev, returnOrder.orderId || returnOrder._id]);
      } else {
        toast.error(data.message || 'Failed to process return');
      }
    } catch (err) {
      console.error('Return error:', err);
      toast.error('Server error while processing return');
    }
  };

  const closeReturnModal = () => {
    setShowReturnModal(false);
    setReturnOrder(null);
    setReturnReason('');
    setReturnType('');
  };

  return (
    <>
      <Layout>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-yellow-700 flex items-center gap-2">
            <FaHistory /> Order History
          </h2>
          <div className="text-sm text-gray-600">
            Total Orders: {orders.length}
          </div>
        </div>

        {/* Search & Filter */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by Order ID, Invoice, Customer Name or Phone..."
                className="w-full border border-gray-300 pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaCalendarAlt className="text-gray-400" />
              </div>
              <input
                type="date"
                className="w-full border border-gray-300 pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
          </div>

          {/* Active Filters */}
          {(searchTerm || selectedDate) && (
            <div className="flex flex-wrap gap-2">
              {searchTerm && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  Search: "{searchTerm}"
                  <button
                    onClick={() => setSearchTerm('')}
                    className="ml-2 hover:text-blue-600"
                  >
                    <FaTimes className="text-xs" />
                  </button>
                </span>
              )}
              {selectedDate && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-green-100 text-green-800">
                  Date: {selectedDate}
                  <button
                    onClick={() => setSelectedDate('')}
                    className="ml-2 hover:text-green-600"
                  >
                    <FaTimes className="text-xs" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left font-semibold text-gray-700">Order ID</th>
                <th className="p-3 text-left font-semibold text-gray-700">Date & Time</th>
                <th className="p-3 text-left font-semibold text-gray-700">Customer</th>
                <th className="p-3 text-center font-semibold text-gray-700">Items</th>
                <th className="p-3 text-left font-semibold text-gray-700">Invoice No</th>
                <th className="p-3 text-left font-semibold text-gray-700">Payment Type</th>
                <th className="p-3 text-right font-semibold text-gray-700">Total</th>
                <th className="p-3 text-center font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center text-gray-500 py-8">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600 mr-2"></div>
                      Loading orders...
                    </div>
                  </td>
                </tr>
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center text-gray-500 py-8">
                    {filteredResults.length === 0 ? 'No orders found' : 'No matching orders found'}
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order, idx) => {
                  const orderId = order.orderId || order._id;
                  const isReturned = returnedOrderIds.includes(orderId);
                  const isChecking = checkingReturn === orderId;

                  return (
                    <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50 transition-colors duration-150">
                      <td className="p-3 font-medium">{orderId}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 text-gray-600">
                          <span>{order.date}</span>
                          <span className="text-gray-400">|</span>
                          <span>{order.time}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{order.customer.name}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {order.items.length}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-sm">{order.invoiceNumber}</td>
                      <td className="p-3">
                        <span className="capitalize">{getPaymentType(order)}</span>
                      </td>
                      <td className="p-3 text-right font-semibold text-green-600">
                        ₹{order.grandTotal.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            className="text-yellow-600 hover:text-yellow-800 p-1 rounded hover:bg-yellow-50 transition-colors duration-150"
                            title="Print Invoice"
                            onClick={() => {
                              setPrintOrder(order);
                              setTimeout(() => handlePrint(), 300);
                            }}
                          >
                            <FaPrint />
                          </button>

                          <button
                            className={`p-1 rounded transition-colors duration-150 ${
                              isReturned || isChecking
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                            }`}
                            onClick={() => !isReturned && !isChecking && handleReturn(order)}
                            disabled={isReturned || isChecking}
                            title={
                              isReturned 
                                ? "Return Already Processed" 
                                : isChecking
                                ? "Checking return status..."
                                : "Return Order"
                            }
                          >
                            {isChecking ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <FaUndoAlt />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-4 border-t border-gray-200 gap-4">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredResults.length)} of {filteredResults.length} orders
              </div>
              
              <div className="flex items-center justify-center">
                {renderPaginationButtons()}
              </div>

              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
            </div>
          )}

          {/* Summary */}
          {!loading && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Showing {filteredResults.length} of {orders.length} orders
                  {filteredResults.length !== orders.length && ' (filtered)'}
                </p>
                <div className="text-sm text-gray-600">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Return Modal */}
        {showReturnModal && returnOrder && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl text-sm relative p-6 max-h-[90vh] overflow-y-auto">
              <button
                onClick={closeReturnModal}
                className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl transition-colors duration-150"
                aria-label="Close"
              >
                <FaTimes />
              </button>

              <h2 className="text-xl font-semibold mb-6 text-center text-red-600 flex items-center justify-center gap-2">
                <FaUndoAlt /> Return / Refund
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-gray-800 mb-3">Return Information</h3>
                  <div className="space-y-2">
                    <p><strong>Return Date:</strong> {new Date().toLocaleDateString()}</p>
                    <p><strong>Order ID:</strong> {returnOrder.orderId || returnOrder._id}</p>
                    <p><strong>Invoice No:</strong> {returnOrder.invoiceNumber}</p>
                    <p className="font-bold text-lg pt-2 text-red-600">
                      <strong>Grand Total:</strong> ₹{returnOrder.grandTotal.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-gray-800 mb-3">Customer Information</h3>
                  <div className="space-y-2 mb-4">
                    <p><strong>Name:</strong> {returnOrder.customer.name}</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Return Reason *</label>
                      <select
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-150"
                      >
                        <option value="">Select Reason</option>
                        <option value="Damaged">Damaged Product</option>
                        <option value="Wrong Item">Wrong Item Delivered</option>
                        <option value="Customer Changed Mind">Customer Changed Mind</option>
                        <option value="Quality Issues">Quality Issues</option>
                        <option value="Size Issues">Size/Measurement Issues</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Refund Method *</label>
                      <select
                        value={returnType}
                        onChange={(e) => setReturnType(e.target.value)}
                        className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-150"
                      >
                        <option value="">Select Refund Method</option>
                        <option value="Cash">Cash</option>
                        <option value="Card">Card Refund</option>
                        <option value="UPI">UPI Refund</option>
                        <option value="Wallet">Wallet Refund</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">Returned Items</h3>
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-3 text-left font-semibold text-gray-700">Product Name</th>
                        <th className="p-3 text-left font-semibold text-gray-700">SKU</th>
                        <th className="p-3 text-right font-semibold text-gray-700">Price</th>
                        <th className="p-3 text-center font-semibold text-gray-700">Qty</th>
                        <th className="p-3 text-right font-semibold text-gray-700">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnOrder.items.map((item, idx) => (
                        <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50 transition-colors duration-150">
                          <td className="p-3">{item.name}</td>
                          <td className="p-3 font-mono text-xs text-gray-600">{item.sku}</td>
                          <td className="p-3 text-right">₹{item.price.toLocaleString()}</td>
                          <td className="p-3 text-center">{item.qty}</td>
                          <td className="p-3 text-right font-medium">₹{(item.price * item.qty).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-medium transition-colors duration-150 flex items-center justify-center gap-2"
                onClick={processReturn}
              >
                <FaUndoAlt /> Confirm Return & Refund
              </button>
            </div>
          </div>
        )}
      </Layout>

      {/* Hidden printable layout */}
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