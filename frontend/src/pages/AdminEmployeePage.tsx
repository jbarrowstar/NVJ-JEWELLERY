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
    if (!email.trim() || !role.trim() || !password?.trim()) {
      toast.error('Email, role, and password are required');
      return;
    }

    try {
      const res = await registerUser({ email, password, role, name, phone });
      if (res.success) {
        setEmployees([res.user, ...employees]);
        toast.success('Employee added');
        setShowModal(false);
        setForm({ name: '', phone: '', email: '', role: 'staff', password: '' });
      } else {
        toast.error(res.message || 'Failed to add employee');
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Server error while saving employee');
    }
  };

  const handleUpdate = async () => {
    if (!editEmployee?._id) return;
    try {
      const res = await updateUser(editEmployee._id, editEmployee);
      if (res.success) {
        setEmployees((prev) =>
          prev.map((emp) => (emp._id === editEmployee._id ? res.user : emp))
        );
        toast.success('Employee updated');
        setEditEmployee(null);
      } else {
        toast.error(res.message || 'Update failed');
      }
    } catch (err) {
      console.error('Update error:', err);
      toast.error('Server error while updating employee');
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      const res = await deleteUser(confirmDeleteId);
      if (res.success) {
        setEmployees((prev) => prev.filter((emp) => emp._id !== confirmDeleteId));
        toast.success('Employee deleted');
        setConfirmDeleteId(null);
      } else {
        toast.error(res.message || 'Delete failed');
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Server error while deleting employee');
    }
  };

  return (
    <Layout>
      <h2 className="text-xl font-bold mb-6 text-yellow-700 flex items-center gap-2">
        <FaUserTie /> Employee Management
      </h2>

      {/* ➕ Add Button */}
      <div className="flex justify-end mb-4">
        <button
          className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 flex items-center gap-2"
          onClick={() => setShowModal(true)}
        >
          <FaPlus /> Add Employee
        </button>
      </div>

      {/* 👥 Employee Table */}
      <div className="bg-white rounded shadow-sm p-4">
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Phone</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">Role</th>
              <th className="p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-500 py-4">
                  Loading employees...
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center text-gray-500 py-4">
                  No employees found
                </td>
              </tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp._id || emp.email} className="border-t">
                  <td className="p-2">{emp.name || '—'}</td>
                  <td className="p-2">{emp.phone || '—'}</td>
                  <td className="p-2">{emp.email}</td>
                  <td className="p-2 capitalize">{emp.role}</td>
                  <td className="p-2 text-center flex justify-center gap-2">
                    <button
                      className="text-blue-600 hover:text-blue-800"
                      onClick={() => setEditEmployee(emp)}
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800"
                      onClick={() => setConfirmDeleteId(emp._id!)}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <p className="text-sm text-gray-500 mt-4">
          Showing {employees.length} employee{employees.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ➕ Add / ✏️ Edit Modal */}
      {(showModal || editEmployee) && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#99A1AF]/90">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md text-sm z-50 relative">
            <button
              onClick={() => {
                setShowModal(false);
                setEditEmployee(null);
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl"
              aria-label="Close"
            >
              <FaTimes />
            </button>

            <h2 className="text-lg font-semibold mb-4 text-center">
              {editEmployee ? 'Edit Employee' : 'Add New Employee'}
            </h2>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Name"
                value={editEmployee ? editEmployee.name || '' : form.name}
                onChange={(e) =>
                  editEmployee
                    ? setEditEmployee({ ...editEmployee, name: e.target.value })
                    : setForm({ ...form, name: e.target.value })
                }
                className="w-full border p-2 rounded"
              />
              <input
                type="tel"
                placeholder="Phone"
                value={editEmployee ? editEmployee.phone || '' : form.phone}
                onChange={(e) =>
                  editEmployee
                    ? setEditEmployee({ ...editEmployee, phone: e.target.value })
                    : setForm({ ...form, phone: e.target.value })
                }
                className="w-full border p-2 rounded"
              />
              <input
                type="email"
                placeholder="Email"
                value={editEmployee ? editEmployee.email : form.email}
                onChange={(e) =>
                  editEmployee
                    ? setEditEmployee({ ...editEmployee, email: e.target.value })
                    : setForm({ ...form, email: e.target.value })
                }
                className="w-full border p-2 rounded"
              />
              {!editEmployee && (
                <input
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full border p-2 rounded"
                />
              )}
              <select
                value={editEmployee ? editEmployee.role : form.role}
                                onChange={(e) =>
                  editEmployee
                    ? setEditEmployee({ ...editEmployee, role: e.target.value as Role })
                    : setForm({ ...form, role: e.target.value as Role })
                }
                className="w-full border p-2 rounded"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditEmployee(null);
                }}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
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
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                {editEmployee ? 'Save Changes' : 'Save Employee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🗑️ Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#99A1AF]/90">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md text-sm z-50 relative">
            <button
              onClick={() => setConfirmDeleteId(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl"
              aria-label="Close"
            >
              <FaTimes />
            </button>

            <h2 className="text-lg font-semibold mb-4 text-center text-red-600">
              Delete Employee
            </h2>

            <p className="text-center text-gray-700 mb-6">
              Are you sure you want to permanently delete this employee?
            </p>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
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
