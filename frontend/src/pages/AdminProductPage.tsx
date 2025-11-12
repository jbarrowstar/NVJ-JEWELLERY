import Layout from '../components/Layout';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  FaBoxOpen, FaPlus, FaEdit, FaTrash, FaTimes, FaPrint, FaImage, FaSync,
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import Fuse from 'fuse.js';
import { useReactToPrint } from 'react-to-print';
import {
  fetchProducts, createProduct, updateProduct, deleteProduct,
} from '../services/productService';
import { fetchCategories } from '../services/categoryService';
import { fetchRates } from '../services/rateService';
import { uploadImage } from '../services/uploadService';

// Type definitions
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
  available?: boolean;
};

type Category = {
  _id?: string;
  name: string;
};

// API Response types
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

interface CategoriesResponse extends ApiResponse<Category[]> {
  categories?: Category[];
}

interface ProductsResponse extends ApiResponse<Product[]> {}

interface RatesResponse {
  gold: {
    '24K': number;
    '22K': number;
    '18K': number;
  };
  silver: number;
}

export default function AdminProductPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

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
  const [filterAvailability, setFilterAvailability] = useState('All');

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

  const printRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `QR-${form.sku || editProduct?.sku || 'Nirvaha'}`,
  });

  const handlePrintClick = useCallback((product?: Product) => {
    const currentSku = product?.sku || form.sku || editProduct?.sku;
    if (!currentSku || currentSku.trim() === '') {
      toast.error('Cannot generate QR code: SKU is not set');
      return;
    }
    handlePrint();
  }, [form.sku, editProduct?.sku, handlePrint]);

  // Reset form function
  const resetForm = () => {
    setForm(emptyForm);
  };

  // Fixed useEffect with proper typing
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

        // Handle products response
        if (Array.isArray(productData)) {
          setProducts(productData);
        } else if (productData && typeof productData === 'object') {
          const productsResponse = productData as ProductsResponse;
          if (productsResponse.success && Array.isArray(productsResponse.data)) {
            setProducts(productsResponse.data);
          } else {
            setProducts([]);
          }
        } else {
          setProducts([]);
        }

        // Handle rates response
        if (rateData && typeof rateData === 'object') {
          const rates = rateData as RatesResponse;
          setGoldRates(rates.gold ?? { '24K': 0, '22K': 0, '18K': 0 });
          setSilverRate(rates.silver ?? 0);
        }

        // Handle categories response with proper typing
        if (Array.isArray(categoryData)) {
          setCategories(categoryData);
        } else if (categoryData && typeof categoryData === 'object') {
          const categoriesResponse = categoryData as CategoriesResponse;
          if (categoriesResponse.success) {
            // Use categories if available, otherwise use data
            setCategories(categoriesResponse.categories || categoriesResponse.data || []);
          } else {
            setCategories([]);
          }
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

  // Fixed rate refresh useEffect
  useEffect(() => {
    let cancelled = false;
    const refreshRates = async () => {
      try {
        const newRates = await fetchRates();
        if (cancelled) return;
        
        const rates = newRates as RatesResponse;
        const goldChanged = JSON.stringify(rates.gold) !== JSON.stringify(goldRates);
        const silverChanged = rates.silver !== silverRate;
        
        if (goldChanged || silverChanged) {
          setGoldRates(rates.gold ?? { '24K': 0, '22K': 0, '18K': 0 });
          setSilverRate(rates.silver ?? 0);
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
      const matchAvailability = filterAvailability === 'All' ||
        (filterAvailability === 'Available' && prod.available !== false) ||
        (filterAvailability === 'Sold Out' && prod.available === false);
      
      return matchCategory && matchWeight && matchPurity && matchPrice && matchAvailability;
    });
  }, [fuse, searchTerm, products, filterCategory, filterWeight, filterPurity, filterPrice, filterAvailability]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

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
    
    try {
      const data = await uploadImage(file);
      
      if (data.success) {
        const imageUrl = data.imageUrl;
        setForm((f) => ({ ...f, image: imageUrl }));
        if (editProduct) setEditProduct({ ...editProduct, image: imageUrl });
        toast.success('Image uploaded successfully');
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
      toast.success('Product added successfully');
      setShowModal(false);
      resetForm();
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
      toast.success('Product updated successfully');
      setEditProduct(null);
      resetForm();
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
      setSelectedProducts(prev => prev.filter(p => p !== toDelete));
      toast.success('Product deleted successfully');
      setConfirmDeleteId(null);
      if (editProduct?._id === toDelete) {
        setEditProduct(null);
        resetForm();
        setShowModal(false);
      }
    } catch (err) {
      console.error('Error deleting product', err);
      toast.error('Error deleting product');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedProducts.length === 0) {
      toast.error('No products selected');
      return;
    }

    try {
      for (const productId of selectedProducts) {
        await deleteProduct(productId);
      }
      
      setProducts(prev => prev.filter(p => !selectedProducts.includes(p._id!)));
      setSelectedProducts([]);
      toast.success(`Deleted ${selectedProducts.length} product(s)`);
    } catch (err) {
      console.error('Error deleting selected products', err);
      toast.error('Error deleting selected products');
    }
  };

  const openAddModal = () => {
    resetForm();
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

  const closeModal = () => {
    setShowModal(false);
    setEditProduct(null);
    resetForm();
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedProducts(paginatedProducts.map(p => p._id!));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const canSave =
    (form.name ?? '').trim() !== '' &&
    (form.category ?? '').trim() !== '' &&
    form.metal &&
    (form.weight ?? '').trim() !== '';

  const numToValue = (num?: number) => (num && num !== 0 ? String(num) : '');

  // Fixed: Show auto rates info using toast instead of toast.info
  const showAutoRatesInfo = () => {
    toast('Rates auto-refresh every 30 seconds', {
      icon: '🔄',
      duration: 3000,
    });
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-yellow-700 flex items-center gap-2">
          <FaBoxOpen /> Products Management
        </h2>
        <div className="flex gap-2">
          <button
            onClick={showAutoRatesInfo}
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 flex items-center gap-2 text-sm transition-colors duration-200"
          >
            <FaSync /> Auto Rates
          </button>
          <button
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 flex items-center gap-2 transition-colors duration-200"
            onClick={openAddModal}
          >
            <FaPlus /> Add Product
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search products by name, SKU, category, purity, or weight..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <select 
            value={filterCategory} 
            onChange={(e) => setFilterCategory(e.target.value)} 
            className="border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
          >
            <option>All Categories</option>
            {categories.map((cat) => (
              <option key={cat._id}>{cat.name}</option>
            ))}
          </select>
          <select 
            value={filterWeight} 
            onChange={(e) => setFilterWeight(e.target.value)} 
            className="border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
          >
            <option>Any Weight</option>
            <option>1g</option>
            <option>2g</option>
            <option>5g+</option>
          </select>
          <select 
            value={filterPurity} 
            onChange={(e) => setFilterPurity(e.target.value)} 
            className="border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
          >
            <option>Any Purity</option>
            <option>18K</option>
            <option>22K</option>
            <option>24K</option>
          </select>
          <select 
            value={filterPrice} 
            onChange={(e) => setFilterPrice(e.target.value)} 
            className="border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
          >
            <option>Any Price</option>
            <option>Below ₹5,000</option>
            <option>₹5,000–₹20,000</option>
            <option>Above ₹20,000</option>
          </select>
          <select 
            value={filterAvailability} 
            onChange={(e) => setFilterAvailability(e.target.value)} 
            className="border border-gray-300 p-2 rounded-lg text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
          >
            <option>All</option>
            <option>Available</option>
            <option>Sold Out</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedProducts.length > 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex justify-between items-center">
          <span className="text-yellow-800 font-medium">
            {selectedProducts.length} product(s) selected
          </span>
          <button
            onClick={handleDeleteSelected}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm transition-colors duration-200"
          >
            <FaTrash /> Delete Selected
          </button>
        </div>
      )}

      {/* Products Summary */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <div className="text-sm text-gray-600">
          Showing {paginatedProducts.length} of {filteredProducts.length} products
          {filteredProducts.length !== products.length && ` (filtered from ${products.length} total)`}
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-center w-12">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={selectedProducts.length === paginatedProducts.length && paginatedProducts.length > 0}
                  className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                />
              </th>
              <th className="p-3 text-left font-semibold text-gray-700">Image</th>
              <th className="p-3 text-left font-semibold text-gray-700">Item Name</th>
              <th className="p-3 text-left font-semibold text-gray-700">SKU</th>
              <th className="p-3 text-left font-semibold text-gray-700">Category</th>
              <th className="p-3 text-left font-semibold text-gray-700">Weight</th>
              <th className="p-3 text-left font-semibold text-gray-700">Purity</th>
              <th className="p-3 text-left font-semibold text-gray-700">Wastage</th>
              <th className="p-3 text-left font-semibold text-gray-700">Making Cost</th>
              <th className="p-3 text-left font-semibold text-gray-700">Stone Price</th>
              <th className="p-3 text-left font-semibold text-gray-700">Price</th>
              <th className="p-3 text-center font-semibold text-gray-700">Status</th>
              <th className="p-3 text-center font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={13} className="text-center text-gray-500 py-8">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600 mr-2"></div>
                    Loading products...
                  </div>
                </td>
              </tr>
            ) : paginatedProducts.length === 0 ? (
              <tr>
                <td colSpan={13} className="text-center text-gray-500 py-8">
                  No products found. Click "Add Product" to create one.
                </td>
              </tr>
            ) : (
              paginatedProducts.map((prod) => (
                <tr key={prod._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors duration-150">
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(prod._id!)}
                      onChange={() => handleSelectProduct(prod._id!)}
                      className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                    />
                  </td>
                  <td className="p-3">
                    {prod.image ? (
                      <img
                        src={prod.image}
                        alt={prod.name}
                        className="w-10 h-10 object-cover rounded-lg"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                        <FaImage className="text-gray-400" />
                      </div>
                    )}
                  </td>
                  <td className="p-3 font-medium">{prod.name}</td>
                  <td className="p-3 font-mono text-sm">{prod.sku}</td>
                  <td className="p-3">{prod.category || '-'}</td>
                  <td className="p-3">{prod.weight || '-'}</td>
                  <td className="p-3">{prod.purity || '-'}</td>
                  <td className="p-3">
                    {prod.wastage ? `${prod.wastage}%` : '-'}
                  </td>
                  <td className="p-3">
                    {prod.makingCharges ? `₹${prod.makingCharges.toLocaleString()}` : '-'}
                  </td>
                  <td className="p-3">
                    {prod.stonePrice ? `₹${prod.stonePrice.toLocaleString()}` : '-'}
                  </td>
                  <td className="p-3 font-semibold text-green-600">
                    ₹{Number(prod.price || 0).toLocaleString()}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      prod.available === false 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {prod.available === false ? 'Sold Out' : 'Available'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors duration-150"
                        onClick={() => openEditModal(prod)}
                        aria-label={`Edit ${prod.name}`}
                        title="Edit Product"
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors duration-150"
                        onClick={() => setConfirmDeleteId(prod._id ?? null)}
                        aria-label={`Delete ${prod.name}`}
                        title="Delete Product"
                      >
                        <FaTrash />
                      </button>
                      <button
                        className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-50 transition-colors duration-150"
                        onClick={() => handlePrintClick(prod)}
                        aria-label={`Print ${prod.name}`}
                        title="Print QR Code"
                      >
                        <FaPrint />
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
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-150"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 border rounded-lg transition-colors duration-150 ${
                    currentPage === page 
                      ? 'bg-yellow-600 text-white border-yellow-600' 
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-150"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ➕ Add / ✏️ Edit Modal */}
      {(showModal || editProduct) && (
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
              {editProduct ? 'Edit Product' : 'Add New Product'}
            </h2>

            {/* Image Upload */}
            <div className="flex justify-center mb-6">
              <label className="cursor-pointer relative">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300 hover:bg-gray-200 transition-colors duration-150 overflow-hidden">
                  {form.image ? (
                    <img
                      src={form.image}
                      alt="Preview"
                      className="w-full h-full object-cover rounded-full"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="text-center">
                      <FaPlus className="text-gray-400 text-xl mb-1 mx-auto" />
                      <span className="text-xs text-gray-500">Add Image</span>
                    </div>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter product name"
                  value={form.name}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (editProduct) setEditProduct({ ...editProduct, name: v });
                    setForm({ ...form, name: v });
                  }}
                  className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={form.category ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (editProduct) setEditProduct({ ...editProduct, category: v });
                    setForm({ ...form, category: v });
                  }}
                  className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Metal Type *
                </label>
                <select
                  value={form.metal}
                  onChange={(e) => {
                    const v = e.target.value as 'gold' | 'silver';
                    if (editProduct) setEditProduct({ ...editProduct, metal: v });
                    setForm({ ...form, metal: v, purity: '' });
                  }}
                  className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
                  required
                >
                  <option value="">Select Metal</option>
                  <option value="gold">Gold</option>
                  <option value="silver">Silver</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (grams) *
                </label>
                <input
                  type="text"
                  placeholder="Enter weight in grams"
                  value={form.weight ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (editProduct) setEditProduct({ ...editProduct, weight: v });
                    setForm({ ...form, weight: v });
                  }}
                  className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
                  required
                />
              </div>

              {/* Purity Dropdown + Rate Preview */}
              {form.metal === 'gold' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purity *
                  </label>
                  <select
                    value={form.purity ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (editProduct) setEditProduct({ ...editProduct, purity: v });
                      setForm({ ...form, purity: v });
                    }}
                    className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
                    required
                  >
                    <option value="">Select Purity</option>
                    <option value="24K">24K</option>
                    <option value="22K">22K</option>
                    <option value="18K">18K</option>
                  </select>
                  {form.purity && (
                    <div className="text-sm text-green-600 mt-1">
                      Current {form.purity} Gold Rate: ₹{goldRates[form.purity as '24K' | '22K' | '18K']?.toLocaleString('en-IN')}/g
                    </div>
                  )}
                </div>
              )}

              {form.metal === 'silver' && (
                <div className="text-sm text-green-600 p-2 bg-green-50 rounded-md">
                  Current Silver Rate: ₹{silverRate.toLocaleString('en-IN')}/g
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Making Charges (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={numToValue(form.makingCharges)}
                    onChange={(e) => {
                      const v = e.target.value;
                      const val = v === '' ? 0 : parseFloat(v);
                      if (editProduct) setEditProduct({ ...editProduct, makingCharges: val });
                      setForm({ ...form, makingCharges: val });
                    }}
                    className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Wastage (%)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={numToValue(form.wastage)}
                    onChange={(e) => {
                      const v = e.target.value;
                      const val = v === '' ? 0 : parseFloat(v);
                      if (editProduct) setEditProduct({ ...editProduct, wastage: val });
                      setForm({ ...form, wastage: val });
                    }}
                    className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stone Price (₹)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={numToValue(form.stonePrice)}
                  onChange={(e) => {
                    const v = e.target.value;
                    const val = v === '' ? 0 : parseFloat(v);
                    if (editProduct) setEditProduct({ ...editProduct, stonePrice: val });
                    setForm({ ...form, stonePrice: val });
                  }}
                  className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Enter product description"
                  value={form.description ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (editProduct) setEditProduct({ ...editProduct, description: v });
                    setForm({ ...form, description: v });
                  }}
                  className="w-full border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
                  rows={3}
                />
              </div>

              {form.weight && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm font-semibold text-blue-800">
                    Estimated Price: ₹{estimatedPrice.toLocaleString('en-IN')}
                  </div>
                </div>
              )}

              {/* QR Code Section */}
              {(form.sku || editProduct?.sku) ? (
                <div className="flex items-center justify-between mt-2 p-3 bg-gray-50 rounded-lg">
                  <label className="text-gray-700 font-medium">QR Code</label>
                  <button
                    onClick={() => handlePrintClick()}
                    className="text-yellow-600 border border-yellow-600 px-3 py-1 rounded-md hover:bg-yellow-50 text-sm flex items-center gap-2 transition-colors duration-150"
                  >
                    Generate <FaPrint />
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-sm text-yellow-700">
                  QR Code will be available after saving the product with a generated SKU.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-150"
              >
                Cancel
              </button>
              <button
                onClick={editProduct ? handleUpdateProduct : handleSaveProduct}
                disabled={!canSave}
                className={`px-4 py-2 rounded-md transition-colors duration-150 flex items-center gap-2 ${
                  canSave 
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                    : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                }`}
              >
                {editProduct ? 'Save Changes' : 'Add Product'}
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
                Delete Product
              </h2>

              <p className="text-gray-700 mb-6">
                Are you sure you want to permanently delete this product? This action cannot be undone.
              </p>

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-150"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteProduct(confirmDeleteId ?? undefined)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-150 flex items-center gap-2"
                >
                  <FaTrash /> Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden QR Print Block - Printable area from 0 to 65mm from top */}
      <div style={{ display: 'none' }}>
        <div ref={printRef}>
          <div style={{
            width: '15mm',
            height: '65mm', // Printable area height (0 to 65mm from top)
            fontFamily: 'Arial, sans-serif',
            fontSize: '6px',
            padding: '2mm 0.5mm', // More vertical padding for top/bottom spacing
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between', // This evenly spaces the sections
            boxSizing: 'border-box',
            border: '1px solid #ccc'
          }}>
            {/* Top section - Name and Details together */}
            <div style={{ 
              textAlign: 'center',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '0.5mm'
            }}>
              {/* Product Name */}
              <div style={{ 
                fontWeight: 'bold', 
                fontSize: '7px',
                wordBreak: 'break-word',
                maxHeight: '12mm',
                overflow: 'hidden',
                lineHeight: '1.1'
              }}>
                {form.name || editProduct?.name || 'Product Name'}
              </div>
              
              {/* Product Details */}
              <div>
                <div style={{ 
                  marginBottom: '0.3mm',
                  fontWeight: 'bold'
                }}>
                  SKU: {form.sku || editProduct?.sku || 'SKU-NOT-SET'}
                </div>
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: '0.2mm',
                  fontSize: '5.5px',
                  lineHeight: '1.1'
                }}>
                  <span><strong>M:</strong> {(form.metal || editProduct?.metal || 'GOLD')?.toUpperCase()}</span>
                  <span><strong>P:</strong> {form.purity || editProduct?.purity || '24K'}</span>
                  <span><strong>W:</strong> {form.weight || editProduct?.weight || '0'}g</span>
                </div>
              </div>
            </div>
            
            {/* Bottom section - QR Code with equal spacing */}
            <div style={{ 
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{ 
                width: '12mm', 
                height: '12mm', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center'
              }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(form.sku || editProduct?.sku || 'DEFAULT-SKU')}`}
                  alt="QR Code"
                  style={{ 
                    width: '100%', 
                    height: '100%',
                    objectFit: 'contain'
                  }}
                  onError={() => {
                    console.warn('QR code failed to load for SKU:', form.sku || editProduct?.sku);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}