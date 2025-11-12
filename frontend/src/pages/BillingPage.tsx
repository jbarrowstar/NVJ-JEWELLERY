import { useState, useEffect, type JSX, useCallback } from 'react';
import Layout from '../components/Layout';
import { fetchProducts, markProductAsSold } from '../services/productService';
import { fetchCustomers, saveCustomer } from '../services/customerService';
import { saveOrder } from '../services/orderService';
import { AiOutlineDelete, AiOutlineProduct } from 'react-icons/ai';
import { FaShoppingCart, FaUser, FaPercentage, FaCalculator, FaTimes, FaFileInvoice, FaRupeeSign, FaSync, FaImage } from 'react-icons/fa';
import toast from 'react-hot-toast';
import Fuse from 'fuse.js';
import InvoiceContent from '../components/InvoiceContent';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import html2pdf from 'html2pdf.js';

type Product = {
  name: string;
  price: number;
  image?: string;
  sku: string;
  available?: boolean;
};

type PaymentMethod = 'Cash' | 'Card' | 'UPI' | 'Bank Transfer' | 'Wallet';

type PaymentDetail = {
  method: PaymentMethod;
  amount: number;
};

type CartItem = {
  name: string;
  price: number;
  qty: number;
  sku: string;
};

type Customer = {
  name: string;
  phone: string;
  email?: string;
};

function SectionHeader({ icon, title }: { icon: JSX.Element; title: string }) {
  return (
    <div className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-4">
      <div className="text-yellow-600">{icon}</div>
      <span>{title}</span>
    </div>
  );
}

// Image helper functions
const validateImageUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  
  try {
    const parsedUrl = new URL(url, window.location.origin);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return typeof url === 'string' && url.length > 0 && !url.includes('undefined') && !url.includes('null');
  }
};

const getImageUrl = (imagePath: string | undefined): string => {
  if (!imagePath || !validateImageUrl(imagePath)) {
    return '/default.jpg';
  }
  
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return normalizedPath;
};

export default function BillingPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [suggestedItems, setSuggestedItems] = useState<Product[]>([]);
  const [filteredItems, setFilteredItems] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [productFuse, setProductFuse] = useState<Fuse<any> | null>(null);

  const [discountType, setDiscountType] = useState<'₹' | '%'>('₹');
  const [discountValue, setDiscountValue] = useState(0);
  const [appliedDiscount, setAppliedDiscount] = useState(0);

  const [taxRate, setTaxRate] = useState(5);
  const [appliedTaxRate, setAppliedTaxRate] = useState(5);

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');

  const [showSelectCustomerModal, setShowSelectCustomerModal] = useState(false);
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerFuse, setCustomerFuse] = useState<Fuse<any> | null>(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<PaymentDetail[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<{[key in PaymentMethod]?: number}>({});
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const [lastOrder, setLastOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Track failed images to prevent infinite retries
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  // Phone number validation
  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\D/g, ''));
  };

  // Email validation
  const validateEmail = (email: string): boolean => {
    if (!email.trim()) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Format phone number for display
  const formatPhone = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    if (cleaned.length <= 10) return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    return cleaned;
  };

  // Handle phone input change with validation
  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    setCustomerPhone(formatted);
    
    const cleaned = value.replace(/\D/g, '');
    if (cleaned && !validatePhone(cleaned)) {
      setPhoneError('Please enter a valid 10-digit mobile number');
    } else {
      setPhoneError('');
    }
  };

  // Handle email input change with validation
  const handleEmailChange = (value: string) => {
    setCustomerEmail(value);
    
    if (value.trim() && !validateEmail(value)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };

  // Load products with improved image handling
  const loadProducts = async () => {
    setLoading(true);
    try {
      const items = await fetchProducts();
      const safeItems = items
        .filter((item) => item.available !== false)
        .map((item) => ({
          name: item.name,
          price: item.price,
          image: item.image,
          sku: item.sku,
          available: item.available,
        }));
      
      console.log('Loaded products:', safeItems);
      
      setSuggestedItems(safeItems);
      setFilteredItems(safeItems);

      const fuse = new Fuse(safeItems, {
        keys: ['name', 'sku'],
        threshold: 0.3,
      });
      setProductFuse(fuse);
    } catch (err) {
      console.error('Product fetch error:', err);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchTerm.trim() && productFuse) {
        const results = productFuse.search(searchTerm);
        setFilteredItems(results.map((r) => r.item));
      } else {
        setFilteredItems(suggestedItems);
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [searchTerm, suggestedItems, productFuse]);

  useEffect(() => {
    if (showSelectCustomerModal) {
      fetchCustomers()
        .then((data) => {
          if (data.success) {
            setCustomerList(data.customers);
            setFilteredCustomers(data.customers);
            const fuse = new Fuse(data.customers, {
              keys: ['name', 'phone'],
              threshold: 0.3,
            });
            setCustomerFuse(fuse);
          }
        })
        .catch((err) => console.error('Customer fetch error:', err));
    }
  }, [showSelectCustomerModal]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (customerSearchTerm.trim() && customerFuse) {
        const results = customerFuse.search(customerSearchTerm);
        setFilteredCustomers(results.map((r) => r.item));
      } else {
        setFilteredCustomers(customerList);
      }
    }, 200);
    return () => clearTimeout(timeout);
  }, [customerSearchTerm, customerList, customerFuse]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const taxAmount = Math.round((subtotal * appliedTaxRate) / 100);
  const grandTotal = subtotal + taxAmount - appliedDiscount;
  const totalPaid = selectedPaymentMethods.reduce((sum, p) => sum + (p.amount || 0), 0);
  const balance = grandTotal - totalPaid;

  const handleAddItem = (name: string, price: number, sku: string) => {
    setCart((prevCart) => {
      const alreadyExists = prevCart.some((item) => item.sku === sku);
      if (alreadyExists) {
        toast.error('This item is already in the cart.');
        return prevCart;
      }
      return [...prevCart, { name, price, qty: 1, sku }];
    });
    setSearchTerm('');
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
  };

  const applyDiscount = () => {
    const discountAmount =
      discountType === '%'
        ? Math.round((subtotal * discountValue) / 100)
        : discountValue;
    setAppliedDiscount(discountAmount);
    toast.success(`Discount of ₹${discountAmount.toLocaleString()} applied`);
  };

  const applyTax = () => {
    setAppliedTaxRate(taxRate);
    toast.success(`Tax rate set to ${taxRate}%`);
  };

  const handleSaveCustomer = async () => {
    try {
      const trimmedName = customerName.trim();
      const cleanedPhone = customerPhone.replace(/\D/g, '');
      const trimmedEmail = customerEmail.trim();

      if (!trimmedName) {
        toast.error('Customer name is required.');
        return;
      }

      if (!cleanedPhone) {
        toast.error('Phone number is required.');
        return;
      }

      if (!validatePhone(cleanedPhone)) {
        toast.error('Please enter a valid 10-digit mobile number.');
        return;
      }

      if (trimmedEmail && !validateEmail(trimmedEmail)) {
        toast.error('Please enter a valid email address.');
        return;
      }

      const customersResponse = await fetchCustomers();
      
      if (customersResponse.success) {
        const isDuplicatePhone = customersResponse.customers.some(
          (c: Customer) => c.phone.replace(/\D/g, '') === cleanedPhone
        );

        if (isDuplicatePhone) {
          toast.error('Customer with this phone number already exists.');
          return;
        }
      }

      const customer = {
        name: trimmedName,
        email: trimmedEmail,
        phone: cleanedPhone,
        notes: customerNotes.trim(),
      };

      await saveCustomer(customer);
      toast.success('Customer saved successfully!');
      setShowCustomerModal(false);
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setCustomerNotes('');
      setPhoneError('');
      setEmailError('');
      
      const updatedCustomers = await fetchCustomers();
      if (updatedCustomers.success) {
        setCustomerList(updatedCustomers.customers);
      }
    } catch (err) {
      console.error('Customer save error:', err);
      toast.error('Server error while saving customer');
    }
  };

  const handleConfirmPayment = async () => {
    if (cart.length === 0 || !customerName.trim() || !customerPhone.trim() || selectedPaymentMethods.length === 0) {
      toast.error('Please complete all required fields.');
      return;
    }

    if (totalPaid <= 0) {
      toast.error('Please enter payment amounts.');
      return;
    }

    const invoiceNumber = `INV-${Date.now()}`;
    const createdAt = new Date().toISOString();

    const order = {
      customer: {
        name: customerName,
        phone: customerPhone,
        email: customerEmail
      },
      items: cart.map((item) => ({
        name: item.name,
        price: item.price,
        qty: item.qty,
        sku: item.sku
      })),
      paymentMethods: selectedPaymentMethods,
      subtotal,
      discount: appliedDiscount,
      tax: taxAmount,
      grandTotal,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      invoiceNumber,
      createdAt
    };

    try {
      const res = await saveOrder(order);
      if (res.success) {
        toast.success(`Order saved! No: ${res.order.orderId}`);
        setLastOrder(res.order);
        setShowPaymentModal(false);
        setShowInvoiceModal(true);

        await Promise.all(
          cart.map((item) => markProductAsSold(item.sku))
        );

        // Refresh product list after marking sold
        loadProducts();

      } else {
        toast.error(res.message || 'Failed to save order');
      }
    } catch (err) {
      console.error('Order save error:', err);
      toast.error('Server error');
    }
  };

  const invoiceRef = useRef<HTMLDivElement>(null);

  const handlePrint = useCallback(
    useReactToPrint({
      contentRef: invoiceRef,
      documentTitle: `Invoice-${lastOrder?.invoiceNumber || 'Nirvaha'}`,
      onAfterPrint: () => {
        console.log('Print completed');
      },
    }),
    [lastOrder]
  );

  const handleDownloadPDF = () => {
    const createPDFContent = () => {
      const container = document.createElement('div');
      container.style.fontFamily = 'Arial, sans-serif';
      container.style.fontSize = '12px';
      container.style.color = '#000000';
      container.style.backgroundColor = '#ffffff';
      container.style.padding = '20px';
      container.style.width = '210mm';

      const header = document.createElement('div');
      header.style.textAlign = 'center';
      header.style.marginBottom = '20px';
      header.style.borderBottom = '2px solid #000';
      header.style.paddingBottom = '10px';
      header.innerHTML = `
        <h1 style="margin: 0; font-size: 24px; color: #000;">NIRVAHA JEWELS</h1>
        <p style="margin: 5px 0; font-size: 14px; color: #666;">Invoice</p>
      `;
      container.appendChild(header);

      const infoSection = document.createElement('div');
      infoSection.style.display = 'flex';
      infoSection.style.justifyContent = 'space-between';
      infoSection.style.marginBottom = '20px';
      infoSection.style.gap = '20px';

      const orderInfo = document.createElement('div');
      orderInfo.style.flex = '1';
      orderInfo.innerHTML = `
        <h3 style="margin: 0 0 10px 0; font-size: 16px; border-bottom: 1px solid #000; padding-bottom: 5px;">Order Information</h3>
        <p style="margin: 5px 0;"><strong>Order ID:</strong> ${lastOrder?.orderId || '—'}</p>
        <p style="margin: 5px 0;"><strong>Invoice No:</strong> ${lastOrder?.invoiceNumber || '—'}</p>
        <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
      `;

      const customerInfo = document.createElement('div');
      customerInfo.style.flex = '1';
      customerInfo.innerHTML = `
        <h3 style="margin: 0 0 10px 0; font-size: 16px; border-bottom: 1px solid #000; padding-bottom: 5px;">Customer Information</h3>
        <p style="margin: 5px 0;"><strong>Name:</strong> ${lastOrder?.customer?.name || '—'}</p>
        <p style="margin: 5px 0;"><strong>Phone:</strong> ${lastOrder?.customer?.phone || '—'}</p>
        <p style="margin: 5px 0;"><strong>Email:</strong> ${lastOrder?.customer?.email || '—'}</p>
      `;

      infoSection.appendChild(orderInfo);
      infoSection.appendChild(customerInfo);
      container.appendChild(infoSection);

      const tableSection = document.createElement('div');
      tableSection.style.marginBottom = '20px';
      
      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.marginBottom = '10px';
      
      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr style="background-color: #f5f5f5;">
          <th style="border: 1px solid #000; padding: 10px; text-align: left; font-weight: bold;">Product</th>
          <th style="border: 1px solid #000; padding: 10px; text-align: right; font-weight: bold;">Price</th>
          <th style="border: 1px solid #000; padding: 10px; text-align: center; font-weight: bold;">Qty</th>
          <th style="border: 1px solid #000; padding: 10px; text-align: right; font-weight: bold;">Subtotal</th>
        </tr>
      `;
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      cart.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td style="border: 1px solid #000; padding: 8px;">${item.name}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: right;">₹${item.price.toLocaleString()}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: center;">${item.qty}</td>
          <td style="border: 1px solid #000; padding: 8px; text-align: right;">₹${(item.price * item.qty).toLocaleString()}</td>
        `;
        tbody.appendChild(row);
      });
      table.appendChild(tbody);
      tableSection.appendChild(table);
      container.appendChild(tableSection);

      const summarySection = document.createElement('div');
      summarySection.style.border = '1px solid #000';
      summarySection.style.padding = '15px';
      summarySection.style.backgroundColor = '#f9f9f9';
      summarySection.style.marginBottom = '20px';

      summarySection.innerHTML = `
        <h3 style="margin: 0 0 15px 0; font-size: 16px; border-bottom: 1px solid #000; padding-bottom: 5px;">Payment Summary</h3>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span>Subtotal:</span>
          <span>₹${subtotal.toLocaleString()}</span>
        </div>
        <div style="display; flex; justify-content: space-between; margin-bottom: 8px;">
          <span>Discount:</span>
          <span>- ₹${appliedDiscount.toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span>Tax (${appliedTaxRate}%):</span>
          <span>₹${taxAmount.toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; border-top: 1px solid #000; padding-top: 10px; margin-top: 10px;">
          <span>Grand Total:</span>
          <span>₹${grandTotal.toLocaleString()}</span>
        </div>
      `;
      container.appendChild(summarySection);

      if (lastOrder?.paymentMethods?.length > 0) {
        const paymentSection = document.createElement('div');
        paymentSection.style.marginBottom = '20px';
        paymentSection.innerHTML = `
          <h3 style="margin: 0 0 10px 0; font-size: 16px; border-bottom: 1px solid #000; padding-bottom: 5px;">Payment Methods</h3>
          ${lastOrder.paymentMethods.map((payment: PaymentDetail) => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <span>${payment.method}:</span>
              <span>₹${payment.amount.toLocaleString()}</span>
            </div>
          `).join('')}
          <div style="display: flex; justify-content: space-between; font-weight: bold; border-top: 1px solid #000; padding-top: 8px; margin-top: 8px;">
            <span>Total Paid:</span>
            <span>₹${lastOrder.paymentMethods.reduce((sum: number, p: PaymentDetail) => sum + p.amount, 0).toLocaleString()}</span>
          </div>
        `;
        container.appendChild(paymentSection);
      }

      const footer = document.createElement('div');
      footer.style.textAlign = 'center';
      footer.style.marginTop = '30px';
      footer.style.paddingTop = '10px';
      footer.style.borderTop = '1px solid #000';
      footer.style.fontSize = '10px';
      footer.style.color = '#666';
      footer.innerHTML = `
        <p style="margin: 5px 0;">Thank you for your business!</p>
        <p style="margin: 5px 0;">Nirvaha Jewels • Contact: +91 XXXXXXXXXX</p>
      `;
      container.appendChild(footer);

      return container;
    };

    const pdfContent = createPDFContent();

    html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename: `Invoice-${lastOrder?.invoiceNumber || 'Nirvaha'}.pdf`,
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
        },
      })
      .from(pdfContent)
      .save()
      .catch((err) => {
        console.error('PDF generation failed:', err);
        toast.error('Failed to generate PDF. Please try printing instead.');
      });
  };

  const resetOrder = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setSelectedPaymentMethods([]);
    setPaymentAmount({});
    setAppliedDiscount(0);
    setDiscountValue(0);
    setShowInvoiceModal(false);
    setFailedImages(new Set()); // Reset failed images on new order
    toast.success('New order started');
  };

  const refreshProducts = async () => {
    setLoading(true);
    try {
      const items = await fetchProducts();
      const safeItems = items
        .filter((item) => item.available !== false)
        .map((item) => ({
          name: item.name,
          price: item.price,
          image: item.image,
          sku: item.sku,
          available: item.available,
        }));
      setSuggestedItems(safeItems);
      setFilteredItems(safeItems);
      setProductFuse(new Fuse(safeItems, { keys: ['name', 'sku'], threshold: 0.3 }));
      setFailedImages(new Set()); // Reset failed images on refresh
      toast.success('Products refreshed');
    } catch (err) {
      console.error('Product refresh error:', err);
      toast.error('Failed to refresh products');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-yellow-700 flex items-center gap-2">
          <FaFileInvoice /> Billing & Checkout
        </h2>
        <div className="flex gap-2">
          <button
            onClick={refreshProducts}
            className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 flex items-center gap-2 text-sm transition-colors duration-200"
            disabled={loading}
          >
            <FaSync className={loading ? 'animate-spin' : ''} /> 
            {loading ? 'Refreshing...' : 'Refresh Products'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
        {/* LEFT SIDE */}
        <div className="space-y-6">
          {/* Product Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <SectionHeader icon={<AiOutlineProduct />} title="Product Selection" />
            
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                placeholder="Scan or search by name or SKU..."
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const query = searchTerm.trim();
                    if (!query || !productFuse) return;

                    const results = productFuse.search(query);
                    if (results.length > 0) {
                      const item = results[0].item;
                      handleAddItem(item.name, item.price, item.sku);
                      toast.success(`Added "${item.name}" to cart`);
                    } else {
                      toast.error(`No matches found for "${query}"`);
                    }
                    setSearchTerm('');
                  }
                }}
                autoFocus
              />
            </div>

            {searchTerm && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm mb-4">
                <p className="text-gray-600 mb-2 font-medium">Suggestions:</p>
                <ul className="space-y-1">
                  {filteredItems.slice(0, 5).map((item, idx) => (
                    <li
                      key={idx}
                      className="cursor-pointer p-2 rounded hover:bg-yellow-50 hover:text-yellow-700 transition-colors duration-150"
                      onClick={() => handleAddItem(item.name, item.price, item.sku)}
                    >
                      {item.name} - ₹{item.price.toLocaleString()}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Products Grid */}
            <div
              className="overflow-y-auto pr-2"
              style={{ maxHeight: '500px' }}
            >
              {loading ? (
                <div className="text-center text-gray-500 py-8">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600 mr-2"></div>
                    Loading products...
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {filteredItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow duration-200 flex flex-col items-center text-center"
                    >
                      <div className="h-20 w-20 rounded-lg mb-3 bg-gray-100 flex items-center justify-center overflow-hidden">
                        {!failedImages.has(item.sku) && item.image ? (
                          <img
                            src={getImageUrl(item.image)}
                            alt={item.name}
                            className="h-full w-full object-cover"
                            onError={() => {
                              console.warn(`Image failed to load for ${item.name}:`, item.image);
                              // Add to failed images set to prevent retries
                              setFailedImages(prev => new Set(prev).add(item.sku));
                            }}
                            onLoad={() => {
                              console.log(`Successfully loaded image for: ${item.name}`);
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-lg">
                            <FaImage className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <span className="font-semibold text-sm text-gray-800 mb-1 line-clamp-2">{item.name}</span>
                      <span className="text-sm text-gray-600 mb-3">
                        ₹{item.price.toLocaleString()}
                      </span>
                      <button
                        onClick={() => handleAddItem(item.name, item.price, item.sku)}
                        disabled={item.available === false || cart.some((c) => c.sku === item.sku)}
                        className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                          item.available === false || cart.some((c) => c.sku === item.sku)
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-yellow-600 text-white hover:bg-yellow-700'
                        }`}
                      >
                        {item.available === false
                          ? 'Sold Out'
                          : cart.some((c) => c.sku === item.sku)
                          ? 'Added ✓'
                          : 'Add to Cart'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <SectionHeader icon={<FaShoppingCart />} title="Items in Cart" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left font-semibold text-gray-700">Product</th>
                    <th className="p-3 text-center font-semibold text-gray-700">Price</th>
                    <th className="p-3 text-center font-semibold text-gray-700">Qty</th>
                    <th className="p-3 text-center font-semibold text-gray-700">Subtotal</th>
                    <th className="p-3 text-center font-semibold text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-gray-500">
                        No items in cart. Add products to get started.
                      </td>
                    </tr>
                  ) : (
                    cart.map((item, idx) => (
                      <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50 transition-colors duration-150">
                        <td className="p-3 text-gray-800 font-medium">{item.name}</td>
                        <td className="p-3 text-center text-gray-700">₹{item.price.toLocaleString()}</td>
                        <td className="p-3 text-center text-gray-700">{item.qty}</td>
                        <td className="p-3 text-center text-gray-700 font-semibold">
                          ₹{(item.price * item.qty).toLocaleString()}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50 transition-colors duration-150"
                            title="Remove item"
                          >
                            <AiOutlineDelete size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Cart Summary */}
            {cart.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Total Items:</span>
                  <span className="font-semibold text-gray-800">{cart.length}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <SectionHeader icon={<FaUser />} title="Customer Information" />
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Name</span>
                <span className="text-gray-900 font-semibold">
                  {customerName || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Contact</span>
                <span className="text-gray-900 font-semibold">
                  {customerPhone || '—'}
                </span>
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <button
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg transition-colors duration-200 font-medium"
                onClick={() => setShowSelectCustomerModal(true)}
              >
                Select Customer
              </button>
              <button
                className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded-lg transition-colors duration-200 font-medium"
                onClick={() => setShowCustomerModal(true)}
              >
                Add New Customer
              </button>
            </div>
          </div>

          {/* Discounts & Taxes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <SectionHeader icon={<FaPercentage />} title="Discounts & Taxes" />

            <div className="space-y-4">
              {/* Discount Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Apply Discount</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder={`Amount in ${discountType}`}
                    className="w-32 border border-gray-300 p-2 rounded-lg text-right focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                  />
                  <button
                    onClick={applyDiscount}
                    className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors duration-200 font-medium"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* Discount Type Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Discount Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDiscountType('%')}
                    className={`px-4 py-2 rounded-lg w-12 text-center font-bold transition-colors duration-200 ${
                      discountType === '%' ? 'bg-gray-800 text-white' : 'bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    %
                  </button>
                  <button
                    onClick={() => setDiscountType('₹')}
                    className={`px-4 py-2 rounded-lg w-12 text-center font-bold transition-colors duration-200 ${
                      discountType === '₹' ? 'bg-gray-800 text-white' : 'bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <FaRupeeSign className="inline text-xs" />
                  </button>
                </div>
              </div>

              {/* Tax Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tax Rate</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-24 border border-gray-300 p-2 rounded-lg text-right focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
                  />
                  <button
                    onClick={applyTax}
                    className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors duration-200 font-medium"
                  >
                    Apply Tax
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <SectionHeader icon={<FaCalculator />} title="Payment Summary" />
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Discount</span>
                <span className="font-semibold text-red-600">- ₹{appliedDiscount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax ({appliedTaxRate}%)</span>
                <span className="font-semibold">₹{taxAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-3 border-t border-gray-200">
                <span>Grand Total</span>
                <span className="text-yellow-700">₹{grandTotal.toLocaleString()}</span>
              </div>
            </div>
            <button
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 rounded-lg mt-4 transition-colors duration-200 font-semibold text-lg"
              onClick={() => {
                if (cart.length === 0) {
                  toast.error('Please add at least one item to the cart.');
                  return;
                }
                if (!customerName.trim() || !customerPhone.trim()) {
                  toast.error('Please select or add a customer before proceeding.');
                  return;
                }
                setShowPaymentModal(true);
              }}
              disabled={cart.length === 0}
            >
              Proceed to Payment
            </button>
          </div>
        </div>
      </div>

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto z-50 relative">
            <button
              onClick={() => {
                setShowCustomerModal(false);
                setPhoneError('');
                setEmailError('');
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl transition-colors duration-150"
              aria-label="Close"
            >
              <FaTimes />
            </button>
            <h2 className="text-lg font-semibold mb-4 text-center text-gray-800">Add New Customer</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input 
                  type="text" 
                  placeholder="Enter customer name" 
                  value={customerName} 
                  onChange={(e) => setCustomerName(e.target.value)} 
                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <input 
                  type="tel" 
                  placeholder="Enter phone number" 
                  value={customerPhone} 
                  onChange={(e) => handlePhoneChange(e.target.value)} 
                  className={`w-full border p-2 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150 ${phoneError ? 'border-red-500' : 'border-gray-300'}`} 
                  maxLength={12}
                />
                {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  placeholder="Enter email address" 
                  value={customerEmail} 
                  onChange={(e) => handleEmailChange(e.target.value)} 
                  className={`w-full border p-2 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150 ${emailError ? 'border-red-500' : 'border-gray-300'}`} 
                />
                {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea 
                  placeholder="Additional notes (optional)" 
                  value={customerNotes} 
                  onChange={(e) => setCustomerNotes(e.target.value)} 
                  className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150 resize-none" 
                  rows={3} 
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button 
                onClick={() => {
                  setShowCustomerModal(false);
                  setPhoneError('');
                  setEmailError('');
                }} 
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-150"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveCustomer} 
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors duration-150 flex items-center gap-2"
              >
                Save Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select Customer Modal */}
      {showSelectCustomerModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md text-sm relative">
            <button
              onClick={() => setShowSelectCustomerModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl transition-colors duration-150"
              aria-label="Close"
            >
              <FaTimes />
            </button>
            <h2 className="text-lg font-semibold mb-4 text-center text-gray-800">Select Customer</h2>
            <input 
              type="text" 
              placeholder="Search customer by name or phone" 
              className="w-full border border-gray-300 p-2 rounded-lg mb-4 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150" 
              value={customerSearchTerm} 
              onChange={(e) => setCustomerSearchTerm(e.target.value)} 
            />
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {filteredCustomers.map((c, idx) => (
                <li key={idx} className="border border-gray-200 p-3 rounded-lg flex justify-between items-center hover:bg-gray-50 transition-colors duration-150">
                  <div>
                    <p className="font-medium text-gray-800">{c.name}</p>
                    <p className="text-sm text-gray-600">{c.phone}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setCustomerName(c.name);
                      setCustomerPhone(c.phone);
                      setCustomerEmail(c.email || '');
                      setShowSelectCustomerModal(false);
                      toast.success(`Customer ${c.name} selected`);
                    }} 
                    className="bg-yellow-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-yellow-700 transition-colors duration-150"
                  >
                    Select
                  </button>
                </li>
              ))}
            </ul>
            <button 
              onClick={() => setShowSelectCustomerModal(false)} 
              className="mt-4 w-full bg-gray-200 hover:bg-gray-300 py-2 rounded-lg transition-colors duration-150 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pay Now Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl text-sm z-50 relative p-6">
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl transition-colors duration-150"
              aria-label="Close"
            >
              <FaTimes />
            </button>
            
            <h2 className="text-xl font-semibold mb-6 text-center text-gray-800">Complete Payment</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Payment Methods */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment Methods</h3>
                
                {(['Cash', 'Card', 'UPI', 'Bank Transfer', 'Wallet'] as PaymentMethod[]).map((method) => {
                  const isSelected = selectedPaymentMethods.some(p => p.method === method);
                  const amount = paymentAmount[method] || 0;
                  
                  return (
                    <div key={method} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPaymentMethods(prev => [
                                  ...prev, 
                                  { method, amount: 0 }
                                ]);
                              } else {
                                setSelectedPaymentMethods(prev => 
                                  prev.filter(p => p.method !== method)
                                );
                                setPaymentAmount(prev => {
                                  const updated = { ...prev };
                                  delete updated[method];
                                  return updated;
                                });
                              }
                            }}
                            className="w-4 h-4 text-yellow-600 focus:ring-yellow-500"
                          />
                          <span className="font-medium text-gray-800">{method}</span>
                        </label>
                      </div>
                      
                      {isSelected && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600 font-medium">₹</span>
                          <input
                            type="number"
                            placeholder="Enter amount"
                            value={amount}
                            onChange={(e) => {
                              const value = Number(e.target.value);
                              setPaymentAmount(prev => ({
                                ...prev,
                                [method]: value
                              }));
                              setSelectedPaymentMethods(prev =>
                                prev.map(p =>
                                  p.method === method ? { ...p, amount: value } : p
                                )
                              );
                            }}
                            className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-150"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Payment Summary */}
                {selectedPaymentMethods.length > 0 && (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total Paid:</span>
                      <span>₹{totalPaid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span>Balance:</span>
                      <span className={`font-semibold ${
                        balance < 0 ? 'text-green-600' : balance > 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        ₹{Math.abs(balance).toLocaleString()}
                        {balance < 0 ? ' (Change)' : balance > 0 ? ' (Due)' : ' (Paid)'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="space-y-4 bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Summary</h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-medium">{customerName || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{customerPhone || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date & Time:</span>
                    <span className="font-medium">
                      {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h4 className="font-semibold text-gray-800 mb-3">Order Items</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-700">{item.name}</span>
                        <span className="font-medium">₹{(item.price * item.qty).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount</span>
                    <span className="text-red-600">- ₹{appliedDiscount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax ({appliedTaxRate}%)</span>
                    <span>₹{taxAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                    <span>Grand Total</span>
                    <span className="text-yellow-700">₹{grandTotal.toLocaleString()}</span>
                  </div>
                </div>
                
                <button
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 rounded-lg mt-4 transition-colors duration-200 font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={handleConfirmPayment}
                  disabled={selectedPaymentMethods.length === 0 || totalPaid <= 0}
                >
                  Confirm Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm pt-10">
          <div className="bg-white rounded-lg shadow-xl p-6 text-sm relative max-h-[80vh] overflow-y-auto w-full max-w-4xl">
            <button
              onClick={() => setShowInvoiceModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl transition-colors duration-150"
              aria-label="Close"
            >
              <FaTimes />
            </button>
            
            <h2 className="text-xl font-semibold mb-6 text-center text-gray-800">Order Invoice</h2>

            {/* Order & Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-gray-800 mb-2">🛒 Order Information</h3>
                <p><strong>Order ID:</strong> {lastOrder?.orderId || '—'}</p>
                <p><strong>Invoice No:</strong> {lastOrder?.invoiceNumber || '—'}</p>
                <p className="font-bold text-lg pt-2 text-yellow-700">
                  <strong>Grand Total:</strong> ₹{grandTotal.toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-gray-800 mb-2">👤 Customer Information</h3>
                <p><strong>Name:</strong> {lastOrder?.customer?.name || '—'}</p>
                <p><strong>Phone:</strong> {lastOrder?.customer?.phone || '—'}</p>
                <p><strong>Email:</strong> {lastOrder?.customer?.email || '—'}</p>
              </div>
            </div>

            {/* Order Items */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">📦 Order Items</h3>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-3 text-left font-semibold text-gray-700">Product</th>
                      <th className="p-3 text-right font-semibold text-gray-700">Price</th>
                      <th className="p-3 text-center font-semibold text-gray-700">Qty</th>
                      <th className="p-3 text-right font-semibold text-gray-700">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item, idx) => (
                      <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="p-3">{item.name}</td>
                        <td className="p-3 text-right">₹{item.price.toLocaleString()}</td>
                        <td className="p-3 text-center">{item.qty}</td>
                        <td className="p-3 text-right font-medium">₹{(item.price * item.qty).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 text-sm mb-6">
              <h3 className="font-semibold text-gray-800 mb-3">💳 Payment Details</h3>
              
              {lastOrder?.paymentMethods?.map((payment: PaymentDetail, index: number) => (
                <div key={index} className="flex justify-between">
                  <span>{payment.method}</span>
                  <span className="font-medium">₹{payment.amount.toLocaleString()}</span>
                </div>
              ))}
              
              <div className="flex justify-between font-semibold border-t border-gray-200 pt-2 mt-2">
                <span>Total Paid</span>
                <span>₹{lastOrder?.paymentMethods?.reduce((sum: number, p: PaymentDetail) => sum + p.amount, 0).toLocaleString()}</span>
              </div>
              
              <div className="flex justify-between text-sm mt-1">
                <span>
                  {lastOrder && lastOrder.paymentMethods?.reduce((sum: number, p: PaymentDetail) => sum + p.amount, 0) >= lastOrder.grandTotal 
                    ? 'Change' 
                    : 'Balance Due'
                  }
                </span>
                <span className={`font-semibold ${
                  lastOrder && lastOrder.paymentMethods?.reduce((sum: number, p: PaymentDetail) => sum + p.amount, 0) >= lastOrder.grandTotal 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  ₹{Math.abs((lastOrder?.grandTotal || 0) - (lastOrder?.paymentMethods?.reduce((sum: number, p: PaymentDetail) => sum + p.amount, 0) || 0)).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Hidden printable layout */}
            <div className="hidden">
              <InvoiceContent
                ref={invoiceRef}
                order={lastOrder}
                subtotal={subtotal}
                grandTotal={grandTotal}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button 
                onClick={handleDownloadPDF} 
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors duration-200 flex items-center gap-2"
              >
                <FaFileInvoice /> Download PDF
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors duration-200 flex items-center gap-2"
              >
                Print Invoice
              </button>
              <button
                onClick={resetOrder}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center gap-2"
              >
                Start New Order
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}