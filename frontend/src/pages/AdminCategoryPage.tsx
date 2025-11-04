import Layout from '../components/Layout';
import { useEffect, useState } from 'react';
import { FaEdit, FaTrash, FaPlus, FaTimes, FaTags } from 'react-icons/fa';
import toast from 'react-hot-toast';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../services/categoryService';

type Category = {
  _id?: string;
  name: string;
  description?: string;
  productCount?: number;
};

export default function AdminCategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Category>({ name: '', description: '' });
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await fetchCategories();
        if (data.success && Array.isArray(data.categories)) {
          setCategories(data.categories);
        } else {
          toast.error(data.message || 'Could not load categories');
        }
      } catch (err) {
        console.error('Category fetch error:', err);
        toast.error('Server error while loading categories');
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      const res = await createCategory(form);
      if (res.success) {
        setCategories([res.category, ...categories]);
        toast.success('Category added');
        setShowModal(false);
        setForm({ name: '', description: '' });
      } else {
        toast.error(res.message || 'Failed to add category');
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Server error while saving category');
    }
  };

  const handleUpdate = async () => {
    if (!editCategory?._id) return;
    try {
      const res = await updateCategory(editCategory._id, editCategory);
      if (res.success) {
        setCategories((prev) =>
          prev.map((cat) => (cat._id === editCategory._id ? res.category : cat))
        );
        toast.success('Category updated');
        setEditCategory(null);
      } else {
        toast.error(res.message || 'Update failed');
      }
    } catch (err) {
      console.error('Update error:', err);
      toast.error('Server error while updating category');
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      const res = await deleteCategory(confirmDeleteId);
      if (res.success) {
        setCategories((prev) => prev.filter((cat) => cat._id !== confirmDeleteId));
        toast.success('Category deleted');
        setConfirmDeleteId(null);
      } else {
        toast.error(res.message || 'Delete failed');
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Server error while deleting category');
    }
  };

  return (
    <Layout>
      <h2 className="text-xl font-bold mb-6 text-yellow-700 flex items-center gap-2">
        <FaTags /> Category Management
      </h2>

      <div className="flex justify-end mb-4">
        <button
          className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 flex items-center gap-2"
          onClick={() => setShowModal(true)}
        >
          <FaPlus /> Add Category
        </button>
      </div>

      <div className="bg-white rounded shadow-sm p-4">
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Category</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-center">Products</th>
              <th className="p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center text-gray-500 py-4">
                  Loading categories...
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-gray-500 py-4">
                  No categories found
                </td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat._id || cat.name} className="border-t">
                  <td className="p-2">{cat.name}</td>
                  <td className="p-2">{cat.description || '—'}</td>
                  <td className="p-2 text-center">{cat.productCount || 0}</td>
                  <td className="p-2 text-center flex justify-center gap-2">
                    <button
                      className="text-blue-600 hover:text-blue-800"
                      onClick={() => setEditCategory(cat)}
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800"
                      onClick={() => setConfirmDeleteId(cat._id!)}
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
          Showing {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
        </p>
      </div>

      {(showModal || editCategory) && (
        <div className="fixed inset-0 bg-gray-400 bg-opacity-20 z-40 flex items-center justify-center">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md text-sm z-50 relative">
            <button
              onClick={() => {
                setShowModal(false);
                setEditCategory(null);
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl"
              aria-label="Close"
            >
              <FaTimes />
            </button>

            <h2 className="text-lg font-semibold mb-4 text-center">
              {editCategory ? 'Edit Category' : 'Add New Category'}
            </h2>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Category Name"
                value={editCategory ? editCategory.name : form.name}
                onChange={(e) =>
                  editCategory
                    ? setEditCategory({ ...editCategory, name: e.target.value })
                    : setForm({ ...form, name: e.target.value })
                }
                className="w-full border p-2 rounded"
              />
              <textarea
                placeholder="Description"
                value={editCategory ? editCategory.description || '' : form.description}
                onChange={(e) =>
                  editCategory
                    ? setEditCategory({ ...editCategory, description: e.target.value })
                    : setForm({ ...form, description: e.target.value })
                }
                className="w-full border p-2 rounded"
              />
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditCategory(null);
                }}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (editCategory) {
                    await handleUpdate();
                  } else {
                    await handleSave();
                  }
                }}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                {editCategory ? 'Save Changes' : 'Save Category'}
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

            <h2 className="text-lg font-semibold mb-4 text-center text-red-600">
              Delete Category
            </h2>

                        <p className="text-center text-gray-700 mb-6">
              Are you sure you want to permanently delete this category?
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
