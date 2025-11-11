import Layout from '../components/Layout';
import { useEffect, useState } from 'react';
import { FaEdit, FaTrash, FaPlus, FaTimes, FaTags, FaCheck, FaTimes as FaTimesIcon, FaSync } from 'react-icons/fa';
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

  // Reset form function
  const resetForm = () => {
    setForm({ name: '', description: '' });
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load categories
        const categoriesData = await fetchCategories();
        
        // Handle different response formats
        let categoriesList: Category[] = [];
        if (Array.isArray(categoriesData)) {
          categoriesList = categoriesData;
        } else if (categoriesData && typeof categoriesData === 'object') {
          if ('success' in categoriesData && categoriesData.success) {
            // Use empty arrays as fallbacks if properties are undefined
            categoriesList = categoriesData.categories || categoriesData.data || [];
          } else if ('categories' in categoriesData && Array.isArray(categoriesData.categories)) {
            categoriesList = categoriesData.categories;
          } else if ('data' in categoriesData && Array.isArray(categoriesData.data)) {
            categoriesList = categoriesData.data;
          } else if (Array.isArray(categoriesData)) {
            categoriesList = categoriesData;
          }
        }
        
        setCategories(categoriesList);

        // Load products to calculate stats
        const products = await fetchProducts();
        calculateProductStats(products, categoriesList);
        
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
        
        toast.success('Category added successfully');
        setShowModal(false);
        resetForm();
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
    
    if (!editCategory.name.trim()) {
      toast.error('Category name is required');
      return;
    }

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

        toast.success('Category updated successfully');
        setEditCategory(null);
        setShowModal(false);
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
        
        toast.success('Category deleted successfully');
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

  const openAddModal = () => {
    resetForm();
    setEditCategory(null);
    setShowModal(true);
  };

  const openEditModal = (cat: Category) => {
    setEditCategory(cat);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditCategory(null);
    resetForm();
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
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 flex items-center gap-2 text-sm transition-colors duration-200"
          >
            <FaSync /> Refresh Stats
          </button>
          <button
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 flex items-center gap-2 transition-colors duration-200"
            onClick={openAddModal}
          >
            <FaPlus /> Add Category
          </button>
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left font-semibold text-gray-700">Category</th>
              <th className="p-3 text-left font-semibold text-gray-700">Description</th>
              <th className="p-3 text-center font-semibold text-gray-700">Total Products</th>
              <th className="p-3 text-center font-semibold text-green-600">
                <FaCheck className="inline mr-1" />
                Available
              </th>
              <th className="p-3 text-center font-semibold text-red-600">
                <FaTimesIcon className="inline mr-1" />
                Sold Out
              </th>
              <th className="p-3 text-center font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center text-gray-500 py-8">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600 mr-2"></div>
                    Loading categories and statistics...
                  </div>
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-gray-500 py-8">
                  No categories found. Click "Add Category" to create one.
                </td>
              </tr>
            ) : (
              categories.map((cat) => {
                const stats = productStats[cat.name] || { total: 0, available: 0, sold: 0 };

                return (
                  <tr key={cat._id || cat.name} className="border-t border-gray-100 hover:bg-gray-50 transition-colors duration-150">
                    <td className="p-3 font-medium">{cat.name}</td>
                    <td className="p-3 text-gray-600">{cat.description || '—'}</td>
                    <td className="p-3 text-center">
                      <span className="font-semibold text-gray-800">{stats.total}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-semibold text-green-600">{stats.available}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="font-semibold text-red-600">{stats.sold}</span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors duration-150"
                          onClick={() => openEditModal(cat)}
                          title="Edit Category"
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors duration-150"
                          onClick={() => setConfirmDeleteId(cat._id!)}
                          title="Delete Category"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        
        {/* Summary Stats */}
        {!loading && categories.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-lg text-gray-800">
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
        
        {/* Category Count */}
        {!loading && (
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex justify-between items-center">
              <p className="text-sm text-yellow-800">
                Showing {categories.length} categor{categories.length !== 1 ? 'ies' : 'y'}
              </p>
              <div className="text-xs text-yellow-700">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ➕ Add / ✏️ Edit Modal */}
      {(showModal || editCategory) && (
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
              {editCategory ? 'Edit Category' : 'Add New Category'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter category name"
                  value={editCategory ? editCategory.name : form.name}
                  onChange={(e) =>
                    editCategory
                      ? setEditCategory({ ...editCategory, name: e.target.value })
                      : setForm({ ...form, name: e.target.value })
                  }
                  className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Enter category description (optional)"
                  value={editCategory ? editCategory.description || '' : form.description}
                  onChange={(e) =>
                    editCategory
                      ? setEditCategory({ ...editCategory, description: e.target.value })
                      : setForm({ ...form, description: e.target.value })
                  }
                  className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional: Add a description to help identify this category
                </p>
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
                  if (editCategory) {
                    await handleUpdate();
                  } else {
                    await handleSave();
                  }
                }}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors duration-150 flex items-center gap-2"
              >
                {editCategory ? 'Save Changes' : 'Add Category'}
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
                Delete Category
              </h2>

              <p className="text-gray-700 mb-6">
                Are you sure you want to permanently delete this category? This action cannot be undone.
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