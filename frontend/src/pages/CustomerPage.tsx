import Layout from '../components/Layout';
import { useEffect, useState, useMemo } from 'react';
import {
  FaSearch,
  FaUserPlus,
  FaTrashAlt,
  FaEdit,
  FaTimes,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import Fuse from 'fuse.js';
import { saveCustomer, fetchCustomers, updateCustomer, deleteCustomer, type Customer } from '../services/customerService';

export default function CustomerPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Customer>({ name: '', email: '', phone: '', notes: '' });
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [fuse, setFuse] = useState<Fuse<Customer> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 30;

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setLoading(true);
        const data = await fetchCustomers();
        if (data.success) {
          setCustomers(data.customers);
          const fuseInstance = new Fuse<Customer>(data.customers, {
            keys: ['name', 'phone', 'email'],
            threshold: 0.3,
            ignoreLocation: true,
            includeScore: true,
          });
          setFuse(fuseInstance);
        }
      } catch (err) {
        console.error('Customer fetch error:', err);
        toast.error('Failed to load customers');
      } finally {
        setLoading(false);
      }
    };

    loadCustomers();
  }, []);

  const filteredResults = useMemo(() => {
    if (!fuse) return customers;
    if (searchTerm.trim()) {
      const matches = fuse
        .search(searchTerm.trim())
        .filter((r) => r.score !== undefined && r.score <= 0.1)
        .map((r) => r.item);
      return matches;
    }
    return customers;
  }, [fuse, searchTerm, customers]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredResults.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredResults, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

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

  const handleSave = async () => {
    const { name, phone } = form;
    if (!name.trim() || !phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }

    try {
      const data = await saveCustomer(form);
      if (data.success) {
        setCustomers([data.customer, ...customers]);
        toast.success('Customer added successfully');
        setShowModal(false);
        setForm({ name: '', email: '', phone: '', notes: '' });
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save customer');
    }
  };

  const handleUpdate = async () => {
    if (!editCustomer) return;

    const { name, phone } = editCustomer;
    if (!name.trim() || !phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }

    try {
      const data = await updateCustomer(editCustomer._id!, editCustomer);
      if (data.success) {
        toast.success('Customer updated successfully');
        setCustomers((prev) =>
          prev.map((c) => (c._id === editCustomer._id ? data.customer : c))
        );
        setEditCustomer(null);
      }
    } catch (err) {
      console.error('Update error:', err);
      toast.error('Failed to update customer');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const data = await deleteCustomer(id);
      if (data.success) {
        toast.success('Customer deleted successfully');
        setCustomers((prev) => prev.filter((c) => c._id !== id));
        setConfirmDeleteId(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete customer');
    }
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-yellow-700 flex items-center gap-2">
          <FaUserPlus /> Customer Management
        </h2>
        <div className="text-sm text-gray-600">
          Total Customers: {customers.length}
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
              placeholder="Search by name, phone, or email..."
              className="w-full border border-gray-300 pl-10 pr-4 py-3 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-150 flex items-center gap-2"
            onClick={() => setShowModal(true)}
          >
            <FaUserPlus /> Add Customer
          </button>
        </div>

        {/* Active Filters */}
        {searchTerm && (
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
              Search: "{searchTerm}"
              <button
                onClick={() => setSearchTerm('')}
                className="ml-2 hover:text-blue-600"
              >
                <FaTimes className="text-xs" />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left font-semibold text-gray-700">Name</th>
              <th className="p-3 text-left font-semibold text-gray-700">Phone</th>
              <th className="p-3 text-left font-semibold text-gray-700">Email</th>
              <th className="p-3 text-left font-semibold text-gray-700">Notes</th>
              <th className="p-3 text-center font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-500 py-8">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600 mr-2"></div>
                    Loading customers...
                  </div>
                </td>
              </tr>
            ) : paginatedCustomers.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-500 py-8">
                  {filteredResults.length === 0 ? 'No customers found' : 'No matching customers found'}
                </td>
              </tr>
            ) : (
              paginatedCustomers.map((customer, idx) => (
                <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50 transition-colors duration-150">
                  <td className="p-3 font-medium">{customer.name}</td>
                  <td className="p-3">{customer.phone}</td>
                  <td className="p-3">{customer.email || '—'}</td>
                  <td className="p-3 text-gray-600">{customer.notes || '—'}</td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        className="text-yellow-600 hover:text-yellow-800 p-1 rounded hover:bg-yellow-50 transition-colors duration-150"
                        title="Edit Customer"
                        onClick={() => setEditCustomer(customer)}
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors duration-150"
                        title="Delete Customer"
                        onClick={() => setConfirmDeleteId(customer._id!)}
                      >
                        <FaTrashAlt />
                      </button>
                    </div>
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
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredResults.length)} of {filteredResults.length} customers
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
                Showing {filteredResults.length} of {customers.length} customers
                {filteredResults.length !== customers.length && ' (filtered)'}
              </p>
              <div className="text-sm text-gray-600">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showModal || editCustomer) && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md text-sm relative p-6">
            <button
              onClick={() => {
                setShowModal(false);
                setEditCustomer(null);
                setForm({ name: '', email: '', phone: '', notes: '' });
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl transition-colors duration-150"
              aria-label="Close"
            >
              <FaTimes />
            </button>

            <h2 className="text-xl font-semibold mb-6 text-center text-yellow-700 flex items-center justify-center gap-2">
              <FaUserPlus /> {editCustomer ? 'Edit Customer' : 'Add New Customer'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  placeholder="Enter customer name"
                  value={editCustomer ? editCustomer.name : form.name}
                  onChange={(e) =>
                    editCustomer
                      ? setEditCustomer({ ...editCustomer, name: e.target.value })
                      : setForm({ ...form, name: e.target.value })
                  }
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                <input
                  type="tel"
                  placeholder="Enter phone number"
                  value={editCustomer ? editCustomer.phone : form.phone}
                  onChange={(e) =>
                    editCustomer
                      ? setEditCustomer({ ...editCustomer, phone: e.target.value })
                      : setForm({ ...form, phone: e.target.value })
                  }
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={editCustomer ? editCustomer.email : form.email}
                  onChange={(e) =>
                    editCustomer
                      ? setEditCustomer({ ...editCustomer, email: e.target.value })
                      : setForm({ ...form, email: e.target.value })
                  }
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  placeholder="Additional notes..."
                  value={editCustomer ? editCustomer.notes : form.notes}
                  onChange={(e) =>
                    editCustomer
                      ? setEditCustomer({ ...editCustomer, notes: e.target.value })
                      : setForm({ ...form, notes: e.target.value })
                  }
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150 resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditCustomer(null);
                  setForm({ name: '', email: '', phone: '', notes: '' });
                }}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors duration-150"
              >
                Cancel
              </button>

              <button
                onClick={editCustomer ? handleUpdate : handleSave}
                className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors duration-150 flex items-center gap-2"
              >
                {editCustomer ? 'Save Changes' : 'Save Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md text-sm relative p-6">
            <button
              onClick={() => setConfirmDeleteId(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl transition-colors duration-150"
              aria-label="Close"
            >
              <FaTimes />
            </button>

            <h2 className="text-xl font-semibold mb-4 text-center text-red-600 flex items-center justify-center gap-2">
              <FaTrashAlt /> Delete Customer
            </h2>

            <p className="text-center text-gray-700 mb-6">
              Are you sure you want to permanently delete this customer? This action cannot be undone.
            </p>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-150 flex items-center gap-2"
              >
                <FaTrashAlt /> Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}