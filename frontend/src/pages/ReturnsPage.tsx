import Layout from '../components/Layout';
import { useEffect, useState, useMemo } from 'react';
import {
  FaSearch,
  FaCalendarAlt,
  FaUndoAlt,
  FaChevronLeft,
  FaChevronRight,
  FaStepBackward,
  FaStepForward
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import Fuse from 'fuse.js';

type ReturnEntry = {
  _id?: string;
  orderId?: string;
  invoiceNumber?: string;
  date: string;
  time: string;
  returnDate?: string;
  returnTime?: string;
  customer: {
    name: string;
    phone: string;
  };
  items: {
    name: string;
    price: number;
    qty: number;
    sku: string;
    _id?: string;
  }[];
  returnType?: string;
  grandTotal?: number;
  status?: string;
};

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ReturnEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [fuse, setFuse] = useState<Fuse<ReturnEntry> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  useEffect(() => {
    fetch('http://localhost:3001/api/returns')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to fetch returns');
        return res.json();
      })
      .then((data) => {
        if (data.success) {
          setReturns(data.returns);
          const fuseInstance = new Fuse<ReturnEntry>(data.returns, {
            keys: ['orderId', 'invoiceNumber', 'customer.name'],
            threshold: 0.3,
            ignoreLocation: true,
            includeScore: true,
          });
          setFuse(fuseInstance);
        } else {
          toast.error('Could not load returns');
        }
      })
      .catch((err) => {
        console.error('Returns fetch error:', err);
        toast.error('Server error while loading returns');
      });
  }, []);

  const filteredByDate = useMemo(() => returns.filter((r) => {
    if (!selectedDate) return true;
    const rawDate = r.returnDate || r.date;
    if (!rawDate) return false;
    const [day, month, year] = rawDate.split('/');
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

    // First page button
    if (startPage > 1) {
      buttons.push(
        <button
          key="first"
          onClick={() => goToPage(1)}
          className="px-3 py-1 border rounded hover:bg-gray-50 flex items-center gap-1"
        >
          <FaStepBackward className="text-xs" />
        </button>
      );
    }

    // Previous page button
    buttons.push(
      <button
        key="prev"
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center gap-1"
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
          className={`px-3 py-1 border rounded ${
            currentPage === page
              ? 'bg-red-600 text-white border-red-600'
              : 'hover:bg-gray-50'
          }`}
        >
          {page}
        </button>
      );
    }

    // Next page button
    buttons.push(
      <button
        key="next"
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 flex items-center gap-1"
      >
        <FaChevronRight className="text-xs" />
      </button>
    );

    // Last page button
    if (endPage < totalPages) {
      buttons.push(
        <button
          key="last"
          onClick={() => goToPage(totalPages)}
          className="px-3 py-1 border rounded hover:bg-gray-50 flex items-center gap-1"
        >
          <FaStepForward className="text-xs" />
        </button>
      );
    }

    return buttons;
  };

  return (
    <Layout>
      <h2 className="text-xl font-bold mb-6 text-red-700 flex items-center gap-2">
        <FaUndoAlt /> Returns / Refunds
      </h2>

      {/* 🔍 Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex items-center border rounded px-3 py-2 w-full md:w-1/2">
          <FaSearch className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search by Order ID, Invoice No, or Customer Name"
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

      {/* 📋 Returns Table */}
      <div className="bg-white rounded shadow-sm p-4">
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Order ID</th>
              <th className="p-2 text-left">Return Date</th>
              <th className="p-2 text-left">Customer</th>
              <th className="p-2 text-left">Invoice No</th>
              <th className="p-2 text-center">Items</th>
              <th className="p-2 text-left">Return Type</th>
              <th className="p-2 text-right">Amount</th>
              <th className="p-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedReturns.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-gray-500 py-4">
                  {filteredResults.length === 0 ? 'No returns found' : 'No matches found'}
                </td>
              </tr>
            ) : (
              paginatedReturns.map((entry, idx) => (
                <tr key={idx} className="border-t hover:bg-gray-50">
                  <td className="p-2 font-medium">{entry.orderId || entry._id || '—'}</td>
                  <td className="p-2">
                    {entry.returnDate || entry.date || '—'} {entry.returnTime || entry.time || ''}
                  </td>
                  <td className="p-2">{entry.customer?.name || '—'}</td>
                  <td className="p-2">{entry.invoiceNumber || '—'}</td>
                  <td className="p-2 text-center">
                    {entry.items?.length ?? '—'} item{entry.items?.length > 1 ? 's' : ''}
                  </td>
                  <td className="p-2">{entry.returnType || '—'}</td>
                  <td className="p-2 text-right font-semibold">
                    ₹{entry.grandTotal !== undefined ? entry.grandTotal.toLocaleString() : '—'}
                  </td>
                  <td className="p-2 text-center">
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      entry.status === 'Completed'
                        ? 'bg-green-100 text-green-700'
                        : entry.status === 'Pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {entry.status || '—'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* 📄 Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredResults.length)} of {filteredResults.length} returns
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center">
              {renderPaginationButtons()}
            </div>

            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
          </div>
        )}

        {/* 📊 Summary when no pagination */}
        {totalPages <= 1 && (
          <p className="text-sm text-gray-500 mt-4">
            Showing {filteredResults.length} of {returns.length} returns
          </p>
        )}
      </div>
    </Layout>
  );
}