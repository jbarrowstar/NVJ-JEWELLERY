import Layout from '../components/Layout';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  FaBoxOpen, FaPlus, FaEdit, FaTrash, FaTimes, FaPrint, FaImage,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import Fuse from 'fuse.js';
import { useReactToPrint } from 'react-to-print';
import {
  fetchProducts, createProduct, updateProduct, deleteProduct,
} from '../services/productService';
import { fetchCategories } from '../services/categoryService';
import { fetchRates } from '../services/rateService';

export type Product = {
  _id?: string;
  name: string;
  sku: string;
  category?: string;
  metal: 'gold' | 'silver';
  weight?: string;
  purity?: string;
  makingCharges?: number;
  wastage?: number;
  stonePrice?: number;
  price: number;
  description?: string;
  image?: string;
  qrCode?: string;
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

  const [goldRates, setGoldRates] = useState<{ '24K': number; '22K': number; '18K': number }>({
    '24K': 0,
    '22K': 0,
    '18K': 0,
  });
  const [silverRate, setSilverRate] = useState(0);

  const [filterCategory, setFilterCategory] = useState('All Categories');
  const [filterWeight, setFilterWeight] = useState('Any Weight');
  const [filterPurity, setFilterPurity] = useState('Any Purity');
  const [filterPrice, setFilterPrice] = useState('Any Price');

  const emptyForm: Product = {
    name: '',
    sku: '',
    category: '',
    metal: 'gold',
    weight: '',
    purity: '',
    makingCharges: 0,
    wastage: 0,
    stonePrice: 0,
    description: '',
    price: 0,
    image: '',
    qrCode: '',
  };

  const [form, setForm] = useState<Product>(emptyForm);

  const qrRef = useRef<HTMLDivElement>(null);
  const handlePrint = useCallback(
    useReactToPrint({
      contentRef: qrRef,
      documentTitle: `QR-${editProduct?.sku || form.sku || 'Nirvaha'}`,
    }),
    [editProduct, form]
  );

  useEffect(() => {
    let mounted = true;
    const loadAll = async () => {
      try {
        const [productData, rateData, categoryData] = await Promise.all([
          fetchProducts(),
          fetchRates(),
          fetchCategories(),
        ]);
        if (!mounted) return;
        setProducts(productData || []);
        setGoldRates(rateData.gold ?? { '24K': 0, '22K': 0, '18K': 0 });
        setSilverRate(rateData.silver ?? 0);

        if (Array.isArray(categoryData)) setCategories(categoryData);
        else if (categoryData?.success && Array.isArray(categoryData.categories)) {
          setCategories(categoryData.categories);
        } else if (Array.isArray(categoryData?.data)) {
          setCategories(categoryData.data);
        } else {
          setCategories([]);
        }
      } catch (err) {
        console.error('Failed to load initial data', err);
        toast.error('Failed to load initial data');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadAll();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refreshRates = async () => {
      try {
        const newRates = await fetchRates();
        if (cancelled) return;
        const goldChanged = JSON.stringify(newRates.gold) !== JSON.stringify(goldRates);
        const silverChanged = newRates.silver !== silverRate;
        if (goldChanged || silverChanged) {
          setGoldRates(newRates.gold ?? { '24K': 0, '22K': 0, '18K': 0 });
          setSilverRate(newRates.silver ?? 0);
          setProducts((prev) =>
            prev.map((p) => ({
              ...p,
              price: calculatePrice(p.metal, p.weight ?? '0', p.wastage, p.makingCharges, p.stonePrice, p.purity),
            }))
          );
          toast.success('Rates updated — prices recalculated');
        }
      } catch (err) {
        console.error('Failed to refresh rates', err);
      }
    };
    const id = setInterval(refreshRates, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, [goldRates, silverRate]);

  const calculatePrice = (
    metal: 'gold' | 'silver',
    weight: string,
    wastage?: number,
    makingCharges?: number,
    stonePrice?: number,
    purity?: string
  ) => {
    const weightGrams = parseFloat(weight || '0') || 0;
    const rate =
      metal === 'gold'
        ? goldRates[purity as '24K' | '22K' | '18K'] ?? 0
        : silverRate;

    const wastageAmount = (weightGrams * rate * (wastage ?? 0)) / 100;
    const basePrice = weightGrams * rate + wastageAmount + (makingCharges ?? 0) + (stonePrice ?? 0);
    return Math.round(basePrice);
  };

  const estimatedPrice = useMemo(() => {
    return calculatePrice(
      form.metal,
      form.weight ?? '0',
      form.wastage,
      form.makingCharges,
      form.stonePrice,
      form.purity
    );
  }, [form.metal, form.weight, form.wastage, form.makingCharges, form.stonePrice, form.purity, goldRates, silverRate]);


const fuse = useMemo(() => new Fuse(products, {
  keys: ['name', 'sku', 'category', 'purity', 'weight'],
  threshold: 0.3,
}), [products]);

const filteredProducts = useMemo(() => {
  const base = searchTerm ? fuse.search(searchTerm).map(r => r.item) : products;
  return base.filter((prod) => {
    const matchCategory = filterCategory === 'All Categories' || prod.category === filterCategory;
    const matchWeight = filterWeight === 'Any Weight' ||
      (filterWeight === '1g' && prod.weight === '1g') ||
      (filterWeight === '2g' && prod.weight === '2g') ||
      (filterWeight === '5g+' && parseFloat(prod.weight ?? '0') >= 5);
    const matchPurity = filterPurity === 'Any Purity' || prod.purity === filterPurity;
    const matchPrice = filterPrice === 'Any Price' ||
      (filterPrice === 'Below ₹5,000' && prod.price < 5000) ||
      (filterPrice === '₹5,000–₹20,000' && prod.price >= 5000 && prod.price <= 20000) ||
      (filterPrice === 'Above ₹20,000' && prod.price > 20000);
    return matchCategory && matchWeight && matchPurity && matchPrice;
  });
}, [fuse, searchTerm, products, filterCategory, filterWeight, filterPurity, filterPrice]);

const getYyyymm = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}${m}`;
};

const sanitizeCategoryPrefix = (category = '') => {
  const clean = String(category || '').replace(/[^A-Za-z]/g, '').toUpperCase();
  return (clean.slice(0, 3) || 'GEN').padEnd(3, 'X');
};

const buildNextSkuFromProducts = (category: string, existingProducts: Product[]) => {
  const safeCategory = category ?? '';
  const prefix = sanitizeCategoryPrefix(safeCategory);
  const yyyymm = getYyyymm();
  const re = new RegExp(`^${prefix}-${yyyymm}-(\\d{4})$`);
  const serials = existingProducts
    .map((p) => {
      if (!p.sku) return 0;
      const m = p.sku.match(re);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => n > 0);
  const nextSerial = (serials.length ? Math.max(...serials) : 0) + 1;
  return `${prefix}-${yyyymm}-${String(nextSerial).padStart(4, '0')}`;
};

const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('image', file);
  try {
    const res = await fetch('http://localhost:3001/api/products/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
      const imageUrl = data.imageUrl;
      setForm((f) => ({ ...f, image: imageUrl }));
      if (editProduct) setEditProduct({ ...editProduct, image: imageUrl });
      toast.success('Image uploaded');
    } else {
      toast.error('Image upload failed');
    }
  } catch (err) {
    console.error('Image upload error', err);
    toast.error('Image upload failed');
  }
};

const handleSaveProduct = async () => {
  const { name } = form;
  const category = form.category ?? '';
  const metal = form.metal;
  const weight = form.weight ?? '';
  if (!name?.trim() || !category?.trim() || !metal || !weight?.trim()) {
    toast.error('Name, Category, Metal, and Weight are required');
    return;
  }
  try {
    const sku = buildNextSkuFromProducts(category, products);
    const qrCode = `QR-${sku}`;
    const finalPrice = calculatePrice(metal, weight, form.wastage, form.makingCharges, form.stonePrice, form.purity);
    const payload: Product = { ...form, sku, qrCode, price: finalPrice };

    const res = await createProduct(payload);
    setProducts((prev) => [res, ...prev]);
    toast.success('Product added');
    setShowModal(false);
    setForm(emptyForm);
    setEditProduct(null);
  } catch (err) {
    console.error('Error saving product', err);
    toast.error('Error saving product');
  }
};

const handleUpdateProduct = async () => {
  if (!editProduct?._id) return;
  try {
    const finalPrice = calculatePrice(
      editProduct.metal,
      editProduct.weight ?? '0',
      editProduct.wastage,
      editProduct.makingCharges,
      editProduct.stonePrice,
      editProduct.purity
    );
    const payload = { ...editProduct, qrCode: `QR-${editProduct.sku}`, price: finalPrice };
    const res = await updateProduct(editProduct._id, payload);
    setProducts((prev) => prev.map((p) => (p._id === editProduct._id ? res : p)));
    toast.success('Product updated');
    setEditProduct(null);
    setForm(emptyForm);
    setShowModal(false);
  } catch (err) {
    console.error('Error updating product', err);
    toast.error('Error updating product');
  }
};

const handleDeleteProduct = async (id?: string) => {
  const toDelete = id ?? confirmDeleteId;
  if (!toDelete) return;
  try {
    await deleteProduct(toDelete);
    setProducts((prev) => prev.filter((p) => p._id !== toDelete));
    toast.success('Product deleted');
    setConfirmDeleteId(null);
    if (editProduct?._id === toDelete) {
      setEditProduct(null);
      setForm(emptyForm);
      setShowModal(false);
    }
  } catch (err) {
    console.error('Error deleting product', err);
    toast.error('Error deleting product');
  }
};

const openAddModal = () => {
  setForm(emptyForm);
  setEditProduct(null);
  setShowModal(true);
};

const openEditModal = (prod: Product) => {
  setEditProduct(prod);
  setForm({
    _id: prod._id,
    name: prod.name || '',
    sku: prod.sku || '',
    category: prod.category || '',
    metal: prod.metal || 'gold',
    weight: prod.weight || '',
    purity: prod.purity || '',
    makingCharges: prod.makingCharges ?? 0,
    wastage: prod.wastage ?? 0,
    stonePrice: prod.stonePrice ?? 0,
    price: prod.price ?? 0,
    description: prod.description || '',
    image: prod.image || '',
    qrCode: prod.qrCode || '',
  });
  setShowModal(true);
};

const canSave =
  (form.name ?? '').trim() !== '' &&
  (form.category ?? '').trim() !== '' &&
  form.metal &&
  (form.weight ?? '').trim() !== '';

const numToValue = (num?: number) => (num && num !== 0 ? String(num) : '');

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
        </div>

        <button
          className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 flex items-center gap-2"
          onClick={openAddModal}
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
              <th className="p-2 text-left">Price</th>
              <th className="p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-4 text-gray-500">Loading...</td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-4 text-gray-500">No products found</td>
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
                  <td className="p-2">₹{Number(prod.price || 0).toFixed(2)}</td>
                  <td className="p-2 text-center flex justify-center gap-2">
                    <button
                      className="text-blue-600 hover:text-blue-800"
                      onClick={() => openEditModal(prod)}
                      aria-label={`Edit ${prod.name}`}
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800"
                      onClick={() => setConfirmDeleteId(prod._id ?? null)}
                      aria-label={`Delete ${prod.name}`}
                    >
                      <FaTrash />
                    </button>
                    <button
                      className="text-gray-600 hover:text-gray-800"
                      onClick={() => { openEditModal(prod); setTimeout(() => handlePrint(), 150); }}
                      aria-label={`Print ${prod.name}`}
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
  <div
    className="fixed inset-0 z-40 flex items-center justify-center bg-[#99A1AF]/90"
    onClick={() => { setShowModal(false); setEditProduct(null); setForm(emptyForm); }}
  >
    <div
      className="bg-white shadow-xl p-6 w-full max-w-md text-sm relative max-h-[80vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => { setShowModal(false); setEditProduct(null); setForm(emptyForm); }}
        className="absolute top-3 right-3 text-gray-500 hover:text-red-500 text-lg"
      >
        <FaTimes />
      </button>

      <h2 className="text-lg font-semibold mb-4 text-center text-gray-800">
        {editProduct ? 'Edit Product' : 'Add New Item'}
      </h2>

      {/* Image Upload */}
      <div className="flex justify-center mb-4">
        <label className="cursor-pointer relative">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border border-gray-300 hover:bg-gray-200 transition overflow-hidden">
            {form.image ? (
              <img
                src={`http://localhost:3001${form.image}`}
                alt="Preview"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <FaPlus className="text-gray-500 text-lg" />
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

      <div className="space-y-3">
        <input
          type="text"
          placeholder="Item Name"
          value={form.name}
          onChange={(e) => {
            const v = e.target.value;
            if (editProduct) setEditProduct({ ...editProduct, name: v });
            setForm({ ...form, name: v });
          }}
          className="w-full border border-gray-300 p-2 rounded-md"
        />

        <select
          value={form.category ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            if (editProduct) setEditProduct({ ...editProduct, category: v });
            setForm({ ...form, category: v });
          }}
          className="w-full border border-gray-300 p-2 rounded-md"
        >
          <option value="">Select Category</option>
          {categories.map((cat) => (
            <option key={cat._id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>

        <select
          value={form.metal}
          onChange={(e) => {
            const v = e.target.value as 'gold' | 'silver';
            if (editProduct) setEditProduct({ ...editProduct, metal: v });
            setForm({ ...form, metal: v, purity: '' });
          }}
          className="w-full border border-gray-300 p-2 rounded-md"
        >
          <option value="">Select Metal</option>
          <option value="gold">Gold</option>
          <option value="silver">Silver</option>
        </select>

        <input
          type="text"
          placeholder="Weight (g)"
          value={form.weight ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            if (editProduct) setEditProduct({ ...editProduct, weight: v });
            setForm({ ...form, weight: v });
          }}
          className="w-full border border-gray-300 p-2 rounded-md"
        />

        {/* ✅ Purity Dropdown + Rate Preview */}
        {form.metal === 'gold' && (
          <>
            <select
              value={form.purity ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                if (editProduct) setEditProduct({ ...editProduct, purity: v });
                setForm({ ...form, purity: v });
              }}
              className="w-full border border-gray-300 p-2 rounded-md"
            >
              <option value="">Select Purity</option>
              <option value="24K">24K</option>
              <option value="22K">22K</option>
              <option value="18K">18K</option>
            </select>

            {form.purity && (
              <div className="text-sm text-gray-500">
                Current Rate: ₹{goldRates[form.purity as '24K' | '22K' | '18K']?.toLocaleString('en-IN')}
              </div>
            )}
          </>
        )}

        {form.metal === 'silver' && (
          <div className="text-sm text-gray-500">
            Silver Rate: ₹{silverRate.toLocaleString('en-IN')}
          </div>
        )}

        <input
          type="number"
          placeholder="Making Charges (₹)"
          value={numToValue(form.makingCharges)}
          onChange={(e) => {
            const v = e.target.value;
            const val = v === '' ? 0 : parseFloat(v);
            if (editProduct) setEditProduct({ ...editProduct, makingCharges: val });
            setForm({ ...form, makingCharges: val });
          }}
          className="w-full border border-gray-300 p-2 rounded-md"
          min="0"
        />

        <input
          type="number"
          placeholder="Wastage (%)"
          value={numToValue(form.wastage)}
          onChange={(e) => {
            const v = e.target.value;
            const val = v === '' ? 0 : parseFloat(v);
            if (editProduct) setEditProduct({ ...editProduct, wastage: val });
            setForm({ ...form, wastage: val });
          }}
          className="w-full border border-gray-300 p-2 rounded-md"
          min="0"
        />

        <input
          type="number"
          placeholder="Stone Price (₹)"
          value={numToValue(form.stonePrice)}
          onChange={(e) => {
            const v = e.target.value;
            const val = v === '' ? 0 : parseFloat(v);
            if (editProduct) setEditProduct({ ...editProduct, stonePrice: val });
            setForm({ ...form, stonePrice: val });
          }}
          className="w-full border border-gray-300 p-2 rounded-md"
          min="0"
        />

        <textarea
          placeholder="Description"
          value={form.description ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            if (editProduct) setEditProduct({ ...editProduct, description: v });
            setForm({ ...form, description: v });
          }}
          className="w-full border border-gray-300 p-2 rounded-md"
          rows={2}
        />

        {form.weight && (
          <div className="text-sm text-gray-600">
            Estimated Price: ₹{estimatedPrice.toLocaleString('en-IN')}
          </div>
        )}

        {/* QR Code Section */}
        {(form.sku || editProduct?.sku) && (
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

      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={() => { setShowModal(false); setEditProduct(null); setForm(emptyForm); }}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          onClick={editProduct ? handleUpdateProduct : handleSaveProduct}
          disabled={!canSave}
          className={`px-4 py-2 rounded-md ${canSave ? 'bg-yellow-600 text-white hover:bg-yellow-700' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
        >
          {editProduct ? 'Save Changes' : 'Add Item'}
        </button>
      </div>
    </div>
  </div>
)}


{/* Delete Confirmation Dialog */}
{confirmDeleteId && (
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#99A1AF]/90">
    <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md text-sm z-50 relative">
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
          onClick={() => handleDeleteProduct(confirmDeleteId ?? undefined)}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Confirm Delete
        </button>
      </div>
    </div>
  </div>
)}

{/* Hidden QR Print Block (no price shown on label) */}
<div style={{ display: 'none' }}>
  <div ref={qrRef}>
    <div style={{ textAlign: 'center', fontFamily: 'sans-serif', padding: '20px' }}>
      <h3>{form.name || editProduct?.name}</h3>
      <p>SKU: {form.sku || editProduct?.sku}</p>
      <p>Metal: {form.metal || editProduct?.metal}</p>
      <p>Purity: {form.purity || editProduct?.purity}</p>
      <p>Weight: {form.weight || editProduct?.weight}</p>
      <img
        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(form.sku || editProduct?.sku || '')}`}
        alt="QR Code"
      />
    </div>
  </div>
</div>

    </>
  );
}
