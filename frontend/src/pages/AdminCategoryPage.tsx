import Layout from '../components/Layout';
import { useEffect, useState } from 'react';
import { FaEdit, FaTrash, FaPlus, FaTimes, FaTags, FaCheck, FaTimes as FaTimesIcon } from 'react-icons/fa';
import toast from 'react-hot-toast';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../services/categoryService';
import { fetchProducts } from '../services/productService';

type Category = {
  _id?: string;
  name: string;
  description?: string;
  productCount?: number;
  availableCount?: number;
  soldCount?: number;
};

type ProductStats = {
  [category: string]: {
    total: number;
    available: number;
    sold: number;
  };
};

export default function AdminCategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<Category>({ name: '', description: '' });
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [productStats, setProductStats] = useState<ProductStats>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load categories
        const categoriesData = await fetchCategories();
        if (categoriesData.success && Array.isArray(categoriesData.categories)) {
          setCategories(categoriesData.categories);
        } else {
          toast.error(categoriesData.message || 'Could not load categories');
        }

        // Load products to calculate stats
        const products = await fetchProducts();
        calculateProductStats(products, categoriesData.categories || []);
        
      } catch (err) {
        console.error('Data fetch error:', err);
        toast.error('Server error while loading data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const calculateProductStats = (products: any[], categories: Category[]) => {
    const stats: ProductStats = {};

    // Initialize stats for all categories
    categories.forEach(category => {
      stats[category.name] = {
        total: 0,
        available: 0,
        sold: 0
      };
    });

    // Calculate stats from products
    products.forEach(product => {
      const categoryName = product.category;
      if (categoryName && stats[categoryName]) {
        stats[categoryName].total++;
        if (product.available === false) {
          stats[categoryName].sold++;
        } else {
          stats[categoryName].available++;
        }
      }
    });

    setProductStats(stats);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      const res = await createCategory(form);
      if (res.success) {
        const updatedCategories = [res.category, ...categories];
        setCategories(updatedCategories);
        
        // Update stats for the new category
        setProductStats(prev => ({
          ...prev,
          [form.name]: { total: 0, available: 0, sold: 0 }
        }));
        
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
      const oldCategoryName = categories.find(cat => cat._id === editCategory._id)?.name;
      const res = await updateCategory(editCategory._id, editCategory);
      if (res.success) {
        const updatedCategories = categories.map((cat) => 
          cat._id === editCategory._id ? res.category : cat
        );
        setCategories(updatedCategories);

        // Update stats if category name changed
        if (oldCategoryName && oldCategoryName !== editCategory.name) {
          setProductStats(prev => {
            const newStats = { ...prev };
            if (newStats[oldCategoryName]) {
              newStats[editCategory.name] = newStats[oldCategoryName];
              delete newStats[oldCategoryName];
            }
            return newStats;
          });
        }

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
    
    const categoryToDelete = categories.find(cat => cat._id === confirmDeleteId);
    
    try {
      const res = await deleteCategory(confirmDeleteId);
      if (res.success) {
        setCategories((prev) => prev.filter((cat) => cat._id !== confirmDeleteId));
        
        // Remove stats for deleted category
        if (categoryToDelete?.name) {
          setProductStats(prev => {
            const newStats = { ...prev };
            delete newStats[categoryToDelete.name];
            return newStats;
          });
        }
        
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

  const refreshStats = async () => {
    try {
      const products = await fetchProducts();
      calculateProductStats(products, categories);
      toast.success('Statistics updated');
    } catch (err) {
      console.error('Stats refresh error:', err);
      toast.error('Failed to refresh statistics');
    }
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-yellow-700 flex items-center gap-2">
          <FaTags /> Category Management
        </h2>
        <div className="flex gap-2">
          <button
            onClick={refreshStats}
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 flex items-center gap-2 text-sm"
          >
            Refresh Stats
          </button>
          <button
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 flex items-center gap-2"
            onClick={() => setShowModal(true)}
          >
            <FaPlus /> Add Category
          </button>
        </div>
      </div>

      <div className="bg-white rounded shadow-sm p-4">
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Category</th>
              <th className="p-2 text-left">Description</th>
              <th className="p-2 text-center">Total Products</th>
              <th className="p-2 text-center text-green-600">
                <FaCheck className="inline mr-1" />
                Available
              </th>
              <th className="p-2 text-center text-red-600">
                <FaTimesIcon className="inline mr-1" />
                Sold Out
              </th>
              <th className="p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center text-gray-500 py-4">
                  Loading categories and statistics...
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-gray-500 py-4">
                  No categories found
                </td>
              </tr>
            ) : (
              categories.map((cat) => {
                const stats = productStats[cat.name] || { total: 0, available: 0, sold: 0 };

                return (
                  <tr key={cat._id || cat.name} className="border-t hover:bg-gray-50">
                    <td className="p-2 font-medium">{cat.name}</td>
                    <td className="p-2">{cat.description || '—'}</td>
                    <td className="p-2 text-center">
                      <span className="font-semibold">{stats.total}</span>
                    </td>
                    <td className="p-2 text-center">
                      <span className="font-semibold text-green-600">{stats.available}</span>
                    </td>
                    <td className="p-2 text-center">
                      <span className="font-semibold text-red-600">{stats.sold}</span>
                    </td>
                    <td className="p-2 text-center flex justify-center gap-2">
                      <button
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                        onClick={() => setEditCategory(cat)}
                        title="Edit Category"
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                        onClick={() => setConfirmDeleteId(cat._id!)}
                        title="Delete Category"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        
        {!loading && categories.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded border">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-lg">
                  {Object.values(productStats).reduce((sum, stat) => sum + stat.total, 0)}
                </div>
                <div className="text-gray-600">Total Products</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-lg text-green-600">
                  {Object.values(productStats).reduce((sum, stat) => sum + stat.available, 0)}
                </div>
                <div className="text-gray-600">Available Products</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-lg text-red-600">
                  {Object.values(productStats).reduce((sum, stat) => sum + stat.sold, 0)}
                </div>
                <div className="text-gray-600">Sold Out Products</div>
              </div>
            </div>
          </div>
        )}
        
        <p className="text-sm text-gray-500 mt-4">
          Showing {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
        </p>
      </div>

      {(showModal || editCategory) && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#99A1AF]/90">
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
                rows={3}
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