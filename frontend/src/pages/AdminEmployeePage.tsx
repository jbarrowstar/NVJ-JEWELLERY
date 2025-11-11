import Layout from '../components/Layout';
import { useEffect, useState } from 'react';
import { FaUserTie, FaEdit, FaTrash, FaPlus, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';
import {
  fetchUsers,
  registerUser,
  updateUser,
  deleteUser,
} from '../services/authService';

type Role = 'staff' | 'admin';

type Employee = {
  _id?: string;
  name?: string;
  phone?: string;
  email: string;
  role: Role;
  password?: string;
};

export default function AdminEmployeePage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Employee>({
    name: '',
    phone: '',
    email: '',
    role: 'staff',
    password: '',
  });
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Reset form function
  const resetForm = () => {
    setForm({
      name: '',
      phone: '',
      email: '',
      role: 'staff',
      password: '',
    });
  };

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await fetchUsers();
        if (data.success && Array.isArray(data.users)) {
          setEmployees(data.users);
        } else {
          toast.error(data.message || 'Could not load employee data');
        }
      } catch (err) {
        console.error('Employee fetch error:', err);
        toast.error('Server error while loading employees');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const handleSave = async () => {
    const { email, role, password, name, phone } = form;
    
    // Validation
    if (!email.trim() || !role.trim() || !password?.trim()) {
      toast.error('Email, role, and password are required');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Password length validation
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      const res = await registerUser({ email, password, role, name, phone });
      if (res.success) {
        setEmployees([res.user, ...employees]);
        toast.success('Employee added successfully');
        setShowModal(false);
        resetForm();
      } else {
        toast.error(res.message || 'Failed to add employee');
      }
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.message || 'Server error while saving employee');
    }
  };

  const handleUpdate = async () => {
    if (!editEmployee?._id) return;
    
    // Validation for update
    if (!editEmployee.email.trim()) {
      toast.error('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmployee.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      const res = await updateUser(editEmployee._id, editEmployee);
      if (res.success) {
        setEmployees((prev) =>
          prev.map((emp) => (emp._id === editEmployee._id ? res.user : emp))
        );
        toast.success('Employee updated successfully');
        setEditEmployee(null);
      } else {
        toast.error(res.message || 'Update failed');
      }
    } catch (err: any) {
      console.error('Update error:', err);
      toast.error(err.message || 'Server error while updating employee');
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      const res = await deleteUser(confirmDeleteId);
      if (res.success) {
        setEmployees((prev) => prev.filter((emp) => emp._id !== confirmDeleteId));
        toast.success('Employee deleted successfully');
        setConfirmDeleteId(null);
      } else {
        toast.error(res.message || 'Delete failed');
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error(err.message || 'Server error while deleting employee');
    }
  };

  const openAddModal = () => {
    resetForm();
    setEditEmployee(null);
    setShowModal(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditEmployee(emp);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditEmployee(null);
    resetForm();
  };

  return (
    <Layout>
      <h2 className="text-xl font-bold mb-6 text-yellow-700 flex items-center gap-2">
        <FaUserTie /> Employee Management
      </h2>

      {/* ➕ Add Button */}
      <div className="flex justify-end mb-4">
        <button
          className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 flex items-center gap-2 transition-colors duration-200"
          onClick={openAddModal}
        >
          <FaPlus /> Add Employee
        </button>
      </div>

      {/* 👥 Employee Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left font-semibold text-gray-700">Name</th>
              <th className="p-3 text-left font-semibold text-gray-700">Phone</th>
              <th className="p-3 text-left font-semibold text-gray-700">Email</th>
              <th className="p-3 text-left font-semibold text-gray-700">Role</th>
              <th className="p-3 text-center font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-500 py-8">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600 mr-2"></div>
                    Loading employees...
                  </div>
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-500 py-8">
                  No employees found. Click "Add Employee" to create one.
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr 
                  key={emp._id || emp.email} 
                  className="border-t border-gray-100 hover:bg-gray-50 transition-colors duration-150"
                >
                  <td className="p-3">{emp.name || '—'}</td>
                  <td className="p-3">{emp.phone || '—'}</td>
                  <td className="p-3 font-medium">{emp.email}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      emp.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {emp.role}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors duration-150"
                        onClick={() => openEditModal(emp)}
                        title="Edit Employee"
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors duration-150"
                        onClick={() => setConfirmDeleteId(emp._id!)}
                        title="Delete Employee"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {/* Summary */}
        {!loading && employees.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Showing {employees.length} employee{employees.length !== 1 ? 's' : ''}
              </p>
              <div className="flex gap-4 text-xs">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  Staff: {employees.filter(emp => emp.role === 'staff').length}
                </span>
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                  Admin: {employees.filter(emp => emp.role === 'admin').length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ➕ Add / ✏️ Edit Modal */}
      {(showModal || editEmployee) && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto z-50 relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl transition-colors duration-150"
              aria-label="Close"
            >
              <FaTimes />
            </button>

            <h2 className="text-lg font-semibold mb-4 text-center text-gray-800">
              {editEmployee ? 'Edit Employee' : 'Add New Employee'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={editEmployee ? editEmployee.name || '' : form.name}
                  onChange={(e) =>
                    editEmployee
                      ? setEditEmployee({ ...editEmployee, name: e.target.value })
                      : setForm({ ...form, name: e.target.value })
                  }
                  className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={editEmployee ? editEmployee.phone || '' : form.phone}
                  onChange={(e) =>
                    editEmployee
                      ? setEditEmployee({ ...editEmployee, phone: e.target.value })
                      : setForm({ ...form, phone: e.target.value })
                  }
                  className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  placeholder="Email address"
                  value={editEmployee ? editEmployee.email : form.email}
                  onChange={(e) =>
                    editEmployee
                      ? setEditEmployee({ ...editEmployee, email: e.target.value })
                      : setForm({ ...form, email: e.target.value })
                  }
                  className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
                  required
                />
              </div>

              {!editEmployee && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    placeholder="Set password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Password must be at least 6 characters long
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role *
                </label>
                <select
                  value={editEmployee ? editEmployee.role : form.role}
                  onChange={(e) =>
                    editEmployee
                      ? setEditEmployee({ ...editEmployee, role: e.target.value as Role })
                      : setForm({ ...form, role: e.target.value as Role })
                  }
                  className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (editEmployee) {
                    await handleUpdate();
                  } else {
                    await handleSave();
                  }
                }}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors duration-150 flex items-center gap-2"
              >
                {editEmployee ? 'Save Changes' : 'Add Employee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🗑️ Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md z-50 relative">
            <button
              onClick={() => setConfirmDeleteId(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl transition-colors duration-150"
              aria-label="Close"
            >
              <FaTimes />
            </button>

            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <FaTrash className="h-6 w-6 text-red-600" />
              </div>
              
              <h2 className="text-lg font-semibold mb-2 text-red-600">
                Delete Employee
              </h2>

              <p className="text-gray-700 mb-6">
                Are you sure you want to permanently delete this employee? This action cannot be undone.
              </p>

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-150"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-150 flex items-center gap-2"
                >
                  <FaTrash /> Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}