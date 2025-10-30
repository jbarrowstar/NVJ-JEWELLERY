import Layout from '../components/Layout';
import { useEffect, useState } from 'react';
import {
  FaSearch,
  FaCalendarAlt,
  FaUndoAlt
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import Fuse from 'fuse.js';

type ReturnEntry = {
  orderId: string;
  date: string; // format: dd/mm/yyyy
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
            keys: ['orderId', 'customer.name'],
            threshold: 0.3,
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

  const filteredByDate = returns.filter((r) => {
    if (!selectedDate) return true;
    const rawDate = r.returnDate || r.date;
    if (!rawDate) return false;
    const [day, month, year] = rawDate.split('/');
    const normalized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    return normalized === selectedDate;
  });

  const fuseResults =
    searchTerm.trim() && fuse
      ? fuse.search(searchTerm).map((r) => r.item).filter((r) => filteredByDate.includes(r))
      : filteredByDate;

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
            placeholder="Search by Order ID or Customer"
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
              <th className="p-2 text-center">Items</th>
              <th className="p-2 text-left">Return Type</th>
              <th className="p-2 text-right">Amount</th>
              <th className="p-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {fuseResults.map((entry, idx) => (
              <tr key={idx} className="border-t">
                <td className="p-2">{entry.orderId || '—'}</td>
                <td className="p-2">
                  {entry.returnDate || entry.date || '—'}{' '}
                  {entry.returnTime || entry.time || ''}
                </td>
                <td className="p-2">{entry.customer?.name || '—'}</td>
                <td className="p-2 text-center">
                  {entry.items?.length ?? '—'} item{entry.items?.length > 1 ? 's' : ''}
                </td>
                <td className="p-2">{entry.returnType || '—'}</td>
                <td className="p-2 text-right">
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
            ))}
          </tbody>
        </table>
        <p className="text-sm text-gray-500 mt-4">
          Showing {fuseResults.length} of {returns.length} returns
        </p>
      </div>
    </Layout>
  );
}
