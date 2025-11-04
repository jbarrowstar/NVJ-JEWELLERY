import Layout from '../components/Layout';
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  FaBoxOpen,
  FaPlus,
  FaEdit,
  FaTrash,
  FaTimes,
  FaPrint,
  FaImage,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import Fuse from 'fuse.js';
import { useReactToPrint } from 'react-to-print';
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../services/productService';
import { fetchCategories } from '../services/categoryService';

type Product = {
  _id?: string;
  name: string;
  price: number;
  sku: string;
  image?: string;
  category?: string;
  weight?: string;
  purity?: string;
  description?: string;
  qrCode?: string;
  stock?: number;
};

type Category = {
  _id?: string;
  name: string;
};

export default function AdminProductPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [form, setForm] = useState<Product>({
    name: '',
    sku: '',
    category: '',
    weight: '',
    purity: '',
    description: '',
    price: 0,
    stock: 0,
    image: '',
  });

  const [filterCategory, setFilterCategory] = useState('All Categories');
  const [filterWeight, setFilterWeight] = useState('Any Weight');
  const [filterPurity, setFilterPurity] = useState('Any Purity');
  const [filterPrice, setFilterPrice] = useState('Any Price');
  const [filterStock, setFilterStock] = useState('All Stock Levels');

  const qrRef = useRef<HTMLDivElement>(null);
  const handlePrint = useCallback(
    useReactToPrint({
      contentRef: qrRef,
      documentTitle: `QR-${editProduct?.sku || form.sku || 'Nirvaha'}`,
    }),
    [editProduct, form]
  );

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await fetchProducts();
        setProducts(data);
      } catch {
        toast.error('Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    const loadCategories = async () => {
      try {
        const data = await fetchCategories();
        if (data.success && Array.isArray(data.categories)) {
          setCategories(data.categories);
        } else {
          toast.error(data.message || 'Could not load categories');
        }
      } catch {
        toast.error('Server error while loading categories');
      }
    };

    loadProducts();
    loadCategories();
  }, []);

  const fuse = new Fuse(products, {
    keys: ['name', 'sku', 'category', 'purity', 'weight'],
    threshold: 0.3,
  });

  const filteredProducts = (searchTerm ? fuse.search(searchTerm).map(r => r.item) : products).filter((prod) => {
    const matchCategory =
      filterCategory === 'All Categories' || prod.category === filterCategory;

    const matchWeight =
      filterWeight === 'Any Weight' ||
      (filterWeight === '1g' && prod.weight === '1g') ||
      (filterWeight === '2g' && prod.weight === '2g') ||
      (filterWeight === '5g+' && parseFloat(prod.weight || '0') >= 5);

    const matchPurity =
      filterPurity === 'Any Purity' || prod.purity === filterPurity;

    const matchPrice =
      filterPrice === 'Any Price' ||
      (filterPrice === 'Below ₹5,000' && prod.price < 5000) ||
      (filterPrice === '₹5,000–₹20,000' && prod.price >= 5000 && prod.price <= 20000) ||
      (filterPrice === 'Above ₹20,000' && prod.price > 20000);

    const matchStock =
      filterStock === 'All Stock Levels' ||
      (filterStock === 'In Stock' && (prod.stock ?? 0) > 0) ||
      (filterStock === 'Out of Stock' && (prod.stock ?? 0) === 0);

    return matchCategory && matchWeight && matchPurity && matchPrice && matchStock;
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);

    const res = await fetch('http://localhost:3001/api/products/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      editProduct
        ? setEditProduct({ ...editProduct, image: data.imageUrl })
        : setForm({ ...form, image: data.imageUrl });
    }
  };

  const handleSaveProduct = async () => {
    const { name, sku, category } = form;
    if (!name || !sku || !category) {
      toast.error('Name, SKU, and Category are required');
      return;
    }

    const qrCode = `QR-${sku}`;
    try {
      const res = await createProduct({ ...form, qrCode });
      setProducts([res, ...products]);
      toast.success('Product added');
      setShowModal(false);
      setForm({
        name: '',
        sku: '',
        category: '',
        weight: '',
        purity: '',
        description: '',
        price: 0,
        stock: 0,
        image: '',
      });
    } catch {
      toast.error('Error saving product');
    }
  };

  const handleUpdateProduct = async () => {
    if (!editProduct?._id) return;
    try {
      const res = await updateProduct(editProduct._id, {
        ...editProduct,
        qrCode: `QR-${editProduct.sku}`,
      });
      setProducts((prev) =>
        prev.map((p) => (p._id === editProduct._id ? res : p))
      );
      toast.success('Product updated');
      setEditProduct(null);
    } catch {
      toast.error('Error updating product');
    }
  };

  const handleDeleteProduct = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteProduct(confirmDeleteId);
      setProducts((prev) => prev.filter((p) => p._id !== confirmDeleteId));
      toast.success('Product deleted');
      setConfirmDeleteId(null);
    } catch {
      toast.error('Error deleting product');
    }
  };

  return (
    <>
      <Layout>
        <h2 className="text-xl font-bold mb-6 text-yellow-700 flex items-center gap-2">
          <FaBoxOpen /> Products Management
        </h2>

        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4 w-full border p-2 rounded"
        />

        <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
          <div className="flex flex-wrap gap-2">
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="border p-2 rounded text-sm">
              <option>All Categories</option>
              {categories.map((cat) => (
                <option key={cat._id}>{cat.name}</option>
              ))}
            </select>
            <select value={filterWeight} onChange={(e) => setFilterWeight(e.target.value)} className="border p-2 rounded text-sm">
              <option>Any Weight</option>
              <option>1g</option>
              <option>2g</option>
              <option>5g+</option>
            </select>
            <select value={filterPurity} onChange={(e) => setFilterPurity(e.target.value)} className="border p-2 rounded text-sm">
              <option>Any Purity</option>
              <option>18K</option>
              <option>22K</option>
              <option>24K</option>
            </select>
            <select value={filterPrice} onChange={(e) => setFilterPrice(e.target.value)} className="border p-2 rounded text-sm">
              <option>Any Price</option>
              <option>Below ₹5,000</option>
                            <option>₹5,000–₹20,000</option>
              <option>Above ₹20,000</option>
            </select>
            <select value={filterStock} onChange={(e) => setFilterStock(e.target.value)} className="border p-2 rounded text-sm">
              <option>All Stock Levels</option>
              <option>In Stock</option>
              <option>Out of Stock</option>
            </select>
          </div>

          <button
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 flex items-center gap-2"
            onClick={() => setShowModal(true)}
          >
            <FaPlus /> Add New Item
          </button>
        </div>

        {/* Product Table */}
        <div className="bg-white rounded shadow-sm p-4 overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Image</th>
                <th className="p-2 text-left">Item Name</th>
                <th className="p-2 text-left">SKU</th>
                <th className="p-2 text-left">Category</th>
                <th className="p-2 text-left">Weight</th>
                <th className="p-2 text-left">Purity</th>
                <th className="p-2 text-left">Stock</th>
                <th className="p-2 text-left">Price</th>
                <th className="p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-gray-500">Loading...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-4 text-gray-500">No products found</td>
                </tr>
              ) : (
                filteredProducts.map((prod) => (
                  <tr key={prod._id} className="border-t">
                    <td className="p-2">
                      {prod.image ? (
                        <img
                          src={`http://localhost:3001${prod.image}`}
                          alt={prod.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                          <FaImage className="text-gray-400" />
                        </div>
                      )}
                    </td>
                    <td className="p-2">{prod.name}</td>
                    <td className="p-2">{prod.sku}</td>
                    <td className="p-2">{prod.category || '-'}</td>
                    <td className="p-2">{prod.weight || '-'}</td>
                    <td className="p-2">{prod.purity || '-'}</td>
                    <td className="p-2">{prod.stock ?? '-'}</td>
                    <td className="p-2">₹{prod.price.toFixed(2)}</td>
                    <td className="p-2 text-center flex justify-center gap-2">
                      <button
                        className="text-blue-600 hover:text-blue-800"
                        onClick={() => setEditProduct(prod)}
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="text-red-600 hover:text-red-800"
                        onClick={() => setConfirmDeleteId(prod._id!)}
                      >
                        <FaTrash />
                      </button>
                      <button
                        className="text-gray-600 hover:text-gray-800"
                        onClick={() => {
                          setEditProduct(prod);
                          setShowModal(true);
                          setTimeout(() => handlePrint(), 100);
                        }}
                      >
                        <FaPrint />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Layout>

      {/* Modal for Add/Edit Product */}
      {(showModal || editProduct) && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-40 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md text-sm z-50 relative">
            <button
              onClick={() => {
                setShowModal(false);
                setEditProduct(null);
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl"
            >
              <FaTimes />
            </button>

            <h2 className="text-xl font-semibold mb-6 text-center text-gray-800">
              {editProduct ? 'Edit Product' : 'Add New Item'}
            </h2>

            {/* Image Upload Icon with Preview */}
            <div className="flex justify-center mb-4">
              <label className="cursor-pointer relative">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center border border-gray-300 hover:bg-gray-200 transition overflow-hidden">
                  {(editProduct?.image || form.image) ? (
                    <img
                      src={`http://localhost:3001${editProduct?.image || form.image}`}
                      alt="Preview"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <FaPlus className="text-gray-500 text-xl" />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Item Name"
                value={editProduct ? editProduct.name : form.name}
                onChange={(e) =>
                  editProduct
                    ? setEditProduct({ ...editProduct, name: e.target.value })
                    : setForm({ ...form, name: e.target.value })
                }
                className="w-full border border-gray-300 p-2 rounded-md"
              />

              <input
                type="text"
                placeholder="SKU"
                value={editProduct ? editProduct.sku : form.sku}
                onChange={(e) =>
                  editProduct
                    ? setEditProduct({ ...editProduct, sku: e.target.value })
                    : setForm({ ...form, sku: e.target.value })
                }
                className="w-full border border-gray-300 p-2 rounded-md"
              />

              <select
                value={editProduct ? editProduct.category : form.category}
                onChange={(e) =>
                  editProduct
                    ? setEditProduct({ ...editProduct, category: e.target.value })
                    : setForm({ ...form, category: e.target.value })
                }
                className="w-full border border-gray-300 p-2 rounded-md"
              >
                <option value="">Dropdown</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Weight"
                value={editProduct ? editProduct.weight || '' : form.weight}
                onChange={(e) =>
                  editProduct
                    ? setEditProduct({ ...editProduct, weight: e.target.value })
                    : setForm({ ...form, weight: e.target.value })
                }
                className="w-full border border-gray-300 p-2 rounded-md"
              />

              <input
                type="text"
                placeholder="Purity"
                value={editProduct ? editProduct.purity || '' : form.purity}
                onChange={(e) =>
                  editProduct
                    ? setEditProduct({ ...editProduct, purity: e.target.value })
                    : setForm({ ...form, purity: e.target.value })
                }
                className="w-full border border-gray-300 p-2 rounded-md"
              />

              <textarea
                placeholder="Description"
                value={editProduct ? editProduct.description || '' : form.description}
                onChange={(e) =>
                  editProduct
                    ? setEditProduct({ ...editProduct, description: e.target.value })
                    : setForm({ ...form, description: e.target.value })
                }
                className="w-full border border-gray-300 p-2 rounded-md"
              />

              <input
                type="number"
                placeholder="Price"
                value={editProduct ? editProduct.price : form.price}
                onChange={(e) =>
                  editProduct
                    ? setEditProduct({ ...editProduct, price: parseFloat(e.target.value) })
                    : setForm({ ...form, price: parseFloat(e.target.value) })
                }
                className="w-full border border-gray-300 p-2 rounded-md"
              />

              <input
              type="number"
              placeholder="Stock Quantity"
              value={editProduct ? editProduct.stock ?? 0 : form.stock}
              onChange={(e) =>
                editProduct
                  ? setEditProduct({ ...editProduct, stock: parseInt(e.target.value) })
                  : setForm({ ...form, stock: parseInt(e.target.value) })
              }
              className="w-full border border-gray-300 p-2 rounded-md"
            />

              {/* QR Code Section */}
              {(editProduct?.sku || form.sku) && (
                <div className="flex items-center justify-between mt-2">
                  <label className="text-gray-700 font-medium">QR Code</label>
                  <button
                    onClick={handlePrint}
                    className="text-yellow-600 border border-yellow-600 px-3 py-1 rounded-md hover:bg-yellow-50 text-sm flex items-center gap-2"
                  >
                    Generate <FaPrint />
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-4 mt-8">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditProduct(null);
                }}
                className="px-4 py-2 border border-gray-400 text-gray-700 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={editProduct ? handleUpdateProduct : handleSaveProduct}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
              >
                {editProduct ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-gray-400 bg-opacity-20 z-40 flex items-center justify-center">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md text-sm z-50 relative">
            <button
              onClick={() => setConfirmDeleteId(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl"
            >
              <FaTimes />
            </button>
            <h2 className="text-lg font-semibold mb-4 text-center text-red-600">
              Delete Product
            </h2>
            <p className="text-center text-gray-700 mb-6">
              Are you sure you want to permanently delete this product?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProduct}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden QR Print Block */}
      <div style={{ display: 'none' }}>
        <div ref={qrRef}>
          <div style={{ textAlign: 'center', fontFamily: 'sans-serif', padding: '20px' }}>
            <h3>{editProduct?.name || form.name}</h3>
            <p>SKU: {editProduct?.sku || form.sku}</p>
            <p>Purity: {editProduct?.purity || form.purity}</p>
            <p>Weight: {editProduct?.weight || form.weight}</p>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${editProduct?.sku || form.sku}`}
              alt="QR Code"
            />
          </div>
        </div>
      </div>
    </>
  );
}
