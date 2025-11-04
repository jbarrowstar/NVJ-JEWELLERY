import Layout from '../components/Layout';
import { useEffect, useState } from 'react';
import { FaSearch, FaUserPlus, FaTrashAlt, FaEdit, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { saveCustomer } from '../services/customerService';

type Customer = {
  _id?: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
};

export default function CustomerPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Customer>({ name: '', email: '', phone: '', notes: '' });
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetch('http://localhost:3001/api/customers')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setCustomers(data.customers);
      })
      .catch((err) => {
        console.error('Customer fetch error:', err);
        toast.error('Failed to load customers');
      });
  }, []);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  const handleSave = async () => {
    const { name, phone } = form;
    if (!name.trim() || !phone.trim()) {
      toast.error('Name and phone are required');
      return;
    }

    try {
      const newCustomer = await saveCustomer(form);
      setCustomers([newCustomer, ...customers]);
      toast.success('Customer added');
      setShowModal(false);
      setForm({ name: '', email: '', phone: '', notes: '' });
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save customer');
    }
  };

  return (
    <Layout>
      <h2 className="text-xl font-bold mb-6 text-[#CC9200] flex items-center gap-2">
        <FaUserPlus /> Customer Management
      </h2>

      {/* 🔍 Search & Add */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between">
        <div className="flex items-center border rounded px-3 py-2 w-1/2 md:1/2">
          <FaSearch className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search by name or phone"
            className="w-full outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          className="bg-[#CC9200] hover:bg-yellow-500 text-white px-4 py-2 rounded flex items-center gap-2"
          onClick={() => setShowModal(true)}
        >
          <FaUserPlus /> Add Customer
        </button>
      </div>

      {/* 📋 Customer Table */}
      <div className="bg-white rounded shadow-sm p-4">
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Phone</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Notes</th>
              <th className="p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.map((c, idx) => (
              <tr key={idx} className="border-t">
                <td className="p-2">{c.name}</td>
                <td className="p-2">{c.phone}</td>
                <td className="p-2">{c.email || '—'}</td>
                <td className="p-2">{c.notes || '—'}</td>
                <td className="p-2 text-center space-x-2">
                  <button
                    className="text-[#CC9200] hover:text-yellow-500"
                    onClick={() => setEditCustomer(c)}
                  >
                    <FaEdit />
                  </button>
                  <button
                    className="text-red-600 hover:text-red-700"
                    onClick={() => setConfirmDeleteId(c._id!)}
                  >
                    <FaTrashAlt />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-sm text-gray-500 mt-4">
          Showing {filteredCustomers.length} of {customers.length} customers
        </p>
      </div>

      {/* ➕ Add / ✏️ Edit Modal */}
      {(showModal || editCustomer) && (
        <div className="fixed inset-0 bg-gray-400 bg-opacity-20 z-40 flex items-center justify-center">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md text-sm z-50 relative">
            <button
              onClick={() => {
                setShowModal(false);
                setEditCustomer(null);
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl"
              aria-label="Close"
            >
              <FaTimes />
            </button>

            <h2 className="text-lg font-semibold mb-4 text-center">
              {editCustomer ? 'Edit Customer' : 'Add New Customer'}
            </h2>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Name"
                value={editCustomer ? editCustomer.name : form.name}
                onChange={(e) =>
                  editCustomer
                    ? setEditCustomer({ ...editCustomer, name: e.target.value })
                    : setForm({ ...form, name: e.target.value })
                }
                className="w-full border p-2 rounded"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={editCustomer ? editCustomer.phone : form.phone}
                onChange={(e) =>
                  editCustomer
                    ? setEditCustomer({ ...editCustomer, phone: e.target.value })
                    : setForm({ ...form, phone: e.target.value })
                }
                className="w-full border p-2 rounded"
              />
              <input
                type="email"
                placeholder="Email"
                value={editCustomer ? editCustomer.email : form.email}
                onChange={(e) =>
                  editCustomer
                    ? setEditCustomer({ ...editCustomer, email: e.target.value })
                    : setForm({ ...form, email: e.target.value })
                }
                className="w-full border p-2 rounded"
              />
              <textarea
                placeholder="Notes"
                value={editCustomer ? editCustomer.notes : form.notes}
                onChange={(e) =>
                  editCustomer
                    ? setEditCustomer({ ...editCustomer, notes: e.target.value })
                    : setForm({ ...form, notes: e.target.value })
                }
                className="w-full border p-2 rounded resize-none"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditCustomer(null);
                }}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  if (editCustomer) {
                    const res = await fetch(`http://localhost:3001/api/customers/${editCustomer._id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(editCustomer),
                    });
                    const data = await res.json();
                    if (data.success) {
                      toast.success('Customer updated');
                      setCustomers((prev) =>
                        prev.map((c) => (c._id === editCustomer._id ? data.customer : c))
                      );
                      setEditCustomer(null);
                    } else {
                      toast.error('Update failed');
                    }
                  } else {
                    await handleSave();
                  }
                }}
                className="px-4 py-2 bg-[#CC9200] text-white rounded hover:bg-yellow-500"
              >
                {editCustomer ? 'Save Changes' : 'Save Customer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
  <div className="fixed inset-0 bg-gray-400 bg-opacity-20 z-40 flex items-center justify-center">
    <div className="bg-white rounded shadow-lg p-6 w-full max-w-md text-sm z-50 relative">
      <button
        onClick={() => setConfirmDeleteId(null)}
        className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl"
        aria-label="Close"
      >
        <FaTimes />
      </button>

      <h2 className="text-lg font-semibold mb-4 text-center text-red-600">Delete Customer</h2>

      <p className="text-center text-gray-700 mb-6">
        Are you sure you want to permanently delete this customer?
      </p>

      <div className="flex justify-center gap-4">
        <button
          onClick={() => setConfirmDeleteId(null)}
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
        <button
          onClick={async () => {
            const res = await fetch(`http://localhost:3001/api/customers/${confirmDeleteId}`, {
              method: 'DELETE',
            });
            const data = await res.json();
            if (data.success) {
              toast.success('Customer deleted');
              setCustomers((prev) => prev.filter((c) => c._id !== confirmDeleteId));
              setConfirmDeleteId(null);
            } else {
              toast.error('Delete failed');
            }
          }}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Confirm Delete
        </button>
      </div>
    </div>
  </div>
)}

    </Layout>
  );
}
