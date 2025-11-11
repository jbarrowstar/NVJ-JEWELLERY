import Layout from '../components/Layout';
import { useEffect, useState, useMemo } from 'react';
import {
  FaSearch,
  FaCalendarAlt,
  FaTimes,
  FaUndoAlt,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import Fuse from 'fuse.js';
import { fetchReturns, type Return } from '../services/returnService';

export default function ReturnsPage() {
  const [returns, setReturns] = useState<Return[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [fuse, setFuse] = useState<Fuse<Return> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 30;

  useEffect(() => {
    const loadReturns = async () => {
      try {
        setLoading(true);
        const data = await fetchReturns();
        
        if (data.success) {
          setReturns(data.returns);
          const fuseInstance = new Fuse<Return>(data.returns, {
            keys: ['orderId', 'invoiceNumber', 'customer.name'],
            threshold: 0.3,
            ignoreLocation: true,
            includeScore: true,
          });
          setFuse(fuseInstance);
        } else {
          toast.error('Could not load returns');
        }
      } catch (err) {
        console.error('Returns fetch error:', err);
        toast.error('Server error while loading returns');
      } finally {
        setLoading(false);
      }
    };

    loadReturns();
  }, []);

  const filteredByDate = useMemo(() => returns.filter((r) => {
    if (!selectedDate) return true;
    if (!r.returnDate) return false;
    const [day, month, year] = r.returnDate.split('/');
    const normalized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    return normalized === selectedDate;
  }), [returns, selectedDate]);

  const filteredResults = useMemo(() => {
    if (!fuse) return filteredByDate;
    if (searchTerm.trim()) {
      const matches = fuse
        .search(searchTerm.trim())
        .filter((r) => r.score !== undefined && r.score <= 0.1)
        .map((r) => r.item);
      return matches.filter((entry) => filteredByDate.includes(entry));
    }
    return filteredByDate;
  }, [fuse, searchTerm, filteredByDate]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
  const paginatedReturns = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredResults.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredResults, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDate]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start page if we're near the end
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

    // Page number buttons
    for (let page = startPage; page <= endPage; page++) {
      buttons.push(
        <button
          key={page}
          onClick={() => goToPage(page)}
          className={`px-3 py-2 border-t border-b border-gray-300 transition-colors duration-150 ${
            currentPage === page
              ? 'bg-red-600 text-white border-red-600'
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

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-red-700 flex items-center gap-2">
          <FaUndoAlt /> Returns / Refunds
        </h2>
        <div className="text-sm text-gray-600">
          Total Returns: {returns.length}
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
              placeholder="Search by Order ID, Invoice No, or Customer Name"
              className="w-full border border-gray-300 pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-150"
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
              className="w-full border border-gray-300 pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors duration-150"
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

      {/* Returns Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left font-semibold text-gray-700">Order ID</th>
              <th className="p-3 text-left font-semibold text-gray-700">Return Date & Time</th>
              <th className="p-3 text-left font-semibold text-gray-700">Customer</th>
              <th className="p-3 text-center font-semibold text-gray-700">Items</th>
              <th className="p-3 text-left font-semibold text-gray-700">Invoice No</th>
              <th className="p-3 text-left font-semibold text-gray-700">Return Type</th>
              <th className="p-3 text-right font-semibold text-gray-700">Amount</th>
              <th className="p-3 text-center font-semibold text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center text-gray-500 py-8">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mr-2"></div>
                    Loading returns...
                  </div>
                </td>
              </tr>
            ) : paginatedReturns.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-gray-500 py-8">
                  {filteredResults.length === 0 ? 'No returns found' : 'No matching returns found'}
                </td>
              </tr>
            ) : (
              paginatedReturns.map((entry, idx) => (
                <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50 transition-colors duration-150">
                  <td className="p-3 font-medium">{entry.orderId || '—'}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2 text-gray-600">
                      <span>{entry.returnDate || '—'}</span>
                      <span className="text-gray-400">|</span>
                      <span>{entry.returnTime || ''}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{entry.customer?.name || '—'}</div>
                  </td>
                  <td className="p-3 text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      {entry.items?.length || 0}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-sm">{entry.invoiceNumber || '—'}</td>
                  <td className="p-3">
                    <span className="capitalize">{entry.returnType || '—'}</span>
                  </td>
                  <td className="p-3 text-right font-semibold text-red-600">
                    ₹{entry.grandTotal !== undefined ? entry.grandTotal.toLocaleString() : '—'}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      entry.status === 'Completed'
                        ? 'bg-green-100 text-green-800'
                        : entry.status === 'Pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {entry.status || 'Completed'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-4 border-t border-gray-200 gap-4">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredResults.length)} of {filteredResults.length} returns
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
                Showing {filteredResults.length} of {returns.length} returns
                {filteredResults.length !== returns.length && ' (filtered)'}
              </p>
              <div className="text-sm text-gray-600">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}