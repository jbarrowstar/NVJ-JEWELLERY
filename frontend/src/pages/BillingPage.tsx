import { useState, useEffect, useRef, type JSX } from 'react';
import Layout from '../components/Layout';
import { fetchProducts } from '../services/productService';
import { saveCustomer } from '../services/customerService';
import { saveOrder } from '../services/orderService';
import { AiOutlineDelete, AiOutlineProduct } from 'react-icons/ai';
import { IoMdQrScanner } from 'react-icons/io';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { FaShoppingCart, FaUser, FaPercentage, FaCalculator, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';
import Fuse from 'fuse.js';

function SectionHeader({ icon, title }: { icon: JSX.Element; title: string }) {
  return (
    <div className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-2">
      <div className="text-[#CC9200]">{icon}</div>
      <span>{title}</span>
    </div>
  );
}


export default function BillingPage() {
  const [cart, setCart] = useState<{ name: string; price: number; qty: number; sku: string }[]>([]);
  const [suggestedItems, setSuggestedItems] = useState<
    { name: string; price: number; image: string; sku: string }[]
  >([]);
  const [filteredItems, setFilteredItems] = useState<
    { name: string; price: number; image: string; sku: string }[]
  >([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [productFuse, setProductFuse] = useState<Fuse<any> | null>(null);

  const [discountType, setDiscountType] = useState<'₹' | '%'>('₹');
  const [discountValue, setDiscountValue] = useState(5000);
  const [appliedDiscount, setAppliedDiscount] = useState(0);

  const [taxRate, setTaxRate] = useState(5);
  const [appliedTaxRate, setAppliedTaxRate] = useState(5);

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  const [showSelectCustomerModal, setShowSelectCustomerModal] = useState(false);
  const [customerList, setCustomerList] = useState<{ name: string; phone: string; email?: string }[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<{ name: string; phone: string; email?: string }[]>([]);

  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerFuse, setCustomerFuse] = useState<Fuse<any> | null>(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'Cash' | 'Card' | 'UPI' | ''>('');
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const [showQRScanner, setShowQRScanner] = useState(false);

  const [lastOrder, setLastOrder] = useState<any>(null);

  useEffect(() => {
    fetchProducts()
      .then((items) => {
        setSuggestedItems(items);
        setFilteredItems(items);
        const fuse = new Fuse(items, {
          keys: ['name', 'sku'],
          threshold: 0.3,
        });
        setProductFuse(fuse);
      })
      .catch((err) => console.error('Product fetch error:', err));
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
      fetch('http://localhost:3001/api/customers')
        .then((res) => res.json())
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

useEffect(() => {
  if (showQRScanner) {
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: 250 },
      false
    );

    scanner.render(
      (decodedText) => {
        setSearchTerm(decodedText.trim()); // ✅ just populate searchTerm
        setShowQRScanner(false);
        toast.success(`Scanned: ${decodedText}`);
      },
      (error) => {
        console.warn('QR scan error:', error);
      }
    );

    return () => {
      scanner.clear().catch((err) => console.error('Failed to clear scanner', err));
    };
  }
}, [showQRScanner]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const taxAmount = Math.round((subtotal * appliedTaxRate) / 100);
  const grandTotal = subtotal + taxAmount - appliedDiscount;

  const handleAddItem = (name: string, price: number, sku: string) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.sku === sku);

      if (existingItem) {
        // Return a new array with updated quantity
        return prevCart.map((item) =>
          item.sku === sku ? { ...item, qty: item.qty + 1 } : item
        );
      } else {
        // Add new item
        return [...prevCart, { name, price, qty: 1, sku }];
      }
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
  };

  const applyTax = () => {
    setAppliedTaxRate(taxRate);
  };

  const handleSaveCustomer = async () => {
    try {
      const trimmedName = customerName.trim();
      const trimmedPhone = customerPhone.trim();

      if (!trimmedName || !trimmedPhone) {
        toast.error('Name and phone number are required.');
        return;
      }

      const isDuplicatePhone = customerList.some(
        (c) => c.phone.trim() === trimmedPhone
      );

      if (isDuplicatePhone) {
        toast.error('Customer with this phone number already exists.');
        return;
      }

      const customer = {
        name: trimmedName,
        email: customerEmail.trim(),
        phone: trimmedPhone,
        notes: customerNotes.trim(),
      };

      await saveCustomer(customer);
      toast.success('Customer saved!');
      setShowCustomerModal(false);
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setCustomerNotes('');
    } catch (err) {
      console.error('Customer save error:', err);
      toast.error('Server error');
    }
  };

  const handleConfirmPayment = async () => {
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const order = {
      invoiceNumber,
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
      paymentMode: selectedPaymentMethod,
      subtotal,
      discount: appliedDiscount,
      tax: taxAmount,
      grandTotal,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const res = await saveOrder(order);
    if (res.success) {
      toast.success('Order saved!');
      setLastOrder(order); // ✅ store full order including email
      setShowPaymentModal(false);
      setShowInvoiceModal(true);
    } else {
      toast.error('Failed to save order');
    }
  };


    return (
    <>
      <Layout>
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
          {/* LEFT SIDE */}
          <div className="space-y-6">
            {/* Product Selection */}
            <div className="bg-white rounded shadow-sm p-4 space-y-4">
              <SectionHeader icon={<AiOutlineProduct />} title="Product Selection" />
<div className="flex items-center gap-2">
  <input
    type="text"
    placeholder="Search by name or SKU..."
    className="border p-2 rounded w-full"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
  />
  <button
    onClick={() => setShowQRScanner(true)}
    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded text-sm flex items-center gap-1"
  >
    <IoMdQrScanner className="text-lg" />
    Scan
  </button>




                {searchTerm && (
                  <div className="bg-white border rounded shadow-sm p-2 text-sm">
                    <p className="text-gray-500 mb-1">Suggestions:</p>
                    <ul className="space-y-1">
                      {filteredItems.map((item, idx) => (
                        <li
                          key={idx}
                          className="cursor-pointer hover:text-[#CC9200]"
                          onClick={() => handleAddItem(item.name, item.price, item.sku)}
                        >
                          {item.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {filteredItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="border rounded shadow-sm p-2 bg-white flex flex-col items-center text-center"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-24 w-24 object-cover rounded mb-2"
                    />
                    <span className="font-semibold text-sm">{item.name}</span>
                    <span className="text-sm text-gray-600 mb-2">
                      ₹{item.price.toLocaleString()}
                    </span>
                    <button
                      onClick={() => handleAddItem(item.name, item.price, item.sku)}
                      className="bg-[#CC9200] text-white px-3 py-1 rounded text-sm"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Cart Table */}
            <div className="bg-white rounded shadow-sm p-4 space-y-4">
              <SectionHeader icon={<FaShoppingCart />} title="Items in Cart" />
              <div className="overflow-x-auto">
                <table className="w-full border">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="p-2 text-left">Product</th>
                      <th className="p-2">Price</th>
                      <th className="p-2">Qty</th>
                      <th className="p-2">Subtotal</th>
                      <th className="p-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">{item.name}</td>
                        <td className="p-2">₹{item.price.toLocaleString()}</td>
                        <td className="p-2">{item.qty}</td>
                        <td className="p-2">
                          ₹{(item.price * item.qty).toLocaleString()}
                        </td>
                        <td className="p-2">
                          <button
                            onClick={() => handleRemoveItem(idx)}
                            className="text-red-500"
                          >
                            <AiOutlineDelete />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>


                  {/* RIGHT SIDE */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded shadow-sm p-6 space-y-4">
            <SectionHeader icon={<FaUser />} title="Customer Information" />
            <div className="border rounded p-4 bg-gray-50 space-y-2 text-sm">
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
            <div className="flex gap-2 pt-2">
              <button
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded"
                onClick={() => setShowSelectCustomerModal(true)}
              >
                Select Customer
              </button>
              <button
                className="flex-1 bg-[#CC9200] hover:bg-yellow-500 text-white py-2 rounded"
                onClick={() => setShowCustomerModal(true)}
              >
                Add New Customer
              </button>
            </div>
          </div>

          {/* Discounts & Taxes */}
          <div className="bg-white rounded shadow-sm p-4 space-y-4">
            <SectionHeader icon={<FaPercentage />} title="Discounts & Taxes" />
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder={`Discount ${discountType}`}
                className="w-32 p-2 border rounded text-right"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
              />
              <button
                onClick={applyDiscount}
                className="bg-black text-white px-4 py-2 rounded"
              >
                Apply Discount
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDiscountType('%')}
                className={`px-4 py-1 rounded w-12 text-center font-bold ${
                  discountType === '%' ? 'bg-black text-white' : 'bg-white border'
                }`}
              >
                %
              </button>
              <button
                onClick={() => setDiscountType('₹')}
                className={`px-4 py-1 rounded w-12 text-center font-bold ${
                  discountType === '₹' ? 'bg-black text-white' : 'bg-white border'
                }`}
              >
                ₹
              </button>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tax Rate</p>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-24 p-2 border rounded text-right"
                />
                <button
                  onClick={applyTax}
                  className="bg-black text-white px-4 py-2 rounded"
                >
                  Apply Tax
                </button>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-white rounded shadow-sm p-4 space-y-2 text-sm">
            <SectionHeader icon={<FaCalculator />} title="Payment Summary" />
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount ({discountType})</span>
              <span>- ₹{appliedDiscount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax ({appliedTaxRate}%)</span>
              <span>₹{taxAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Grand Total</span>
              <span>₹{grandTotal.toLocaleString()}</span>
            </div>
            <button
              className="w-full bg-[#CC9200] hover:bg-yellow-500 text-white py-2 rounded mt-4"
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
            >
              Pay Now
            </button>
          </div>
        </div>
      </div>
    </Layout>


{/* Customer Modal */}
{showCustomerModal && (
  <div className="fixed inset-0 bg-gray-400 bg-opacity-20 z-40 flex items-center justify-center">
    <div className="bg-white rounded shadow-lg p-6 w-full max-w-md text-sm z-50 relative">
      <button
        onClick={() => setShowCustomerModal(false)}
        className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl"
        aria-label="Close"
      >
        <FaTimes />
      </button>
      <h2 className="text-lg font-semibold mb-4 text-center">Add New Customer</h2>
      <div className="space-y-3">
        <input type="text" placeholder="Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full border p-2 rounded" />
        <input type="email" placeholder="Email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="w-full border p-2 rounded" />
        <input type="tel" placeholder="Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full border p-2 rounded" />
        <textarea placeholder="Notes" value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} className="w-full border p-2 rounded resize-none" rows={3} />
      </div>
      <div className="flex justify-end gap-4 mt-6">
        <button onClick={() => setShowCustomerModal(false)} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Cancel</button>
        <button onClick={handleSaveCustomer} className="px-4 py-2 bg-[#CC9200] text-white rounded hover:bg-yellow-500">Save Customer</button>
      </div>
    </div>
  </div>
)}

{/* Select Customer Modal */}
{showSelectCustomerModal && (
  <div className="fixed inset-0 bg-gray-400 bg-opacity-20 z-40 flex items-center justify-center">
    <div className="bg-white rounded shadow-lg p-6 w-full max-w-md text-sm relative">
      <button
        onClick={() => setShowSelectCustomerModal(false)}
        className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl"
        aria-label="Close"
      >
        <FaTimes />
      </button>
      <h2 className="text-lg font-semibold mb-4 text-center">Select Customer</h2>
      <input type="text" placeholder="Search Customer by name or phone" className="w-full border p-2 rounded mb-4" value={customerSearchTerm} onChange={(e) => setCustomerSearchTerm(e.target.value)} />
      <ul className="space-y-2 max-h-64 overflow-y-auto">
        {filteredCustomers.map((c, idx) => (
          <li key={idx} className="border p-2 rounded flex justify-between items-center">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-gray-600">{c.phone}</p>
            </div>
            <button onClick={() => {
              setCustomerName(c.name);
              setCustomerPhone(c.phone);
              setCustomerEmail(c.email || '');
              setShowSelectCustomerModal(false);
            }} className="bg-[#CC9200] text-white px-3 py-1 rounded text-sm">Select</button>
          </li>
        ))}
      </ul>
      <button onClick={() => setShowSelectCustomerModal(false)} className="mt-4 w-full bg-gray-300 hover:bg-gray-400 py-2 rounded">Cancel</button>
    </div>
  </div>
)}

{/* Pay Now Modal */}
{showPaymentModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center">
    <div className="bg-white rounded shadow-lg w-full max-w-2xl text-sm z-50 relative p-4">
      <button
        onClick={() => setShowPaymentModal(false)}
        className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl"
        aria-label="Close"
      >
        <FaTimes />
      </button>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT: Payment Method */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-center">Select Payment Method</h2>
          {['Card', 'Cash', 'UPI'].map((method) => (
            <button
              key={method}
              onClick={() => setSelectedPaymentMethod(method as 'Cash' | 'Card' | 'UPI')}
              className={`w-full py-2 rounded border font-semibold ${
                selectedPaymentMethod === method ? 'bg-[#CC9200] text-white' : 'bg-white text-gray-800 hover:bg-gray-100'
              }`}
            >
              {method}
            </button>
          ))}
        </div>

        {/* RIGHT: Order Summary */}
        <div className="space-y-2 bg-gray-50 border rounded p-4">
          <h2 className="text-lg font-semibold text-center mb-2">Order Summary</h2>
          <div className="text-sm text-gray-700 space-y-1">
            <p><span className="font-medium">Customer:</span> {customerName || '—'}</p>
            <p><span className="font-medium">Phone:</span> {customerPhone || '—'}</p>
            <p><span className="font-medium">Date:</span> {new Date().toLocaleDateString()}</p>
            <p><span className="font-medium">Time:</span> {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="pt-2 border-t space-y-1">
            {cart.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{item.name}</span>
                <span>₹{(item.price * item.qty).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>- ₹{appliedDiscount.toLocaleString()}</span></div>
            <div className="flex justify-between"><span>Tax ({appliedTaxRate}%)</span><span>₹{taxAmount.toLocaleString()}</span></div>
            <div className="flex justify-between font-bold text-base pt-2 border-t"><span>Grand Total</span><span>₹{grandTotal.toLocaleString()}</span></div>
          </div>
          <button
            className="w-full bg-[#CC9200] hover:bg-yellow-500 text-white py-2 rounded mt-4"
            onClick={handleConfirmPayment}
            disabled={!selectedPaymentMethod}
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
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
    <div className="bg-white rounded shadow-lg w-full max-w-3xl text-sm relative p-6">
      <button
        onClick={() => setShowInvoiceModal(false)}
        className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl"
        aria-label="Close"
      >
        <FaTimes />
      </button>
      <h2 className="text-xl font-semibold mb-6 text-center">Order Details – Invoice</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50 border rounded p-4 space-y-2">
          <h3 className="font-semibold text-gray-800 mb-2">🛒 Order Info</h3>
          <p><strong>Invoice Date:</strong> {new Date().toLocaleDateString()}</p>
          <p><strong>Invoice No:</strong> {lastOrder?.invoiceNumber || '—'}</p>
          <p><strong>Payment Mode:</strong> {selectedPaymentMethod || '—'}</p>
          <p className="font-bold text-lg pt-2"><strong>Grand Total:</strong> ₹{grandTotal.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 border rounded p-4 space-y-2">
                    <h3 className="font-semibold text-gray-800 mb-2">👤 Customer Info</h3>
          <p><strong>Name:</strong> {lastOrder?.customer?.name || '—'}</p>
          <p><strong>Phone:</strong> {lastOrder?.customer?.phone || '—'}</p>
          <p><strong>Email:</strong> {lastOrder?.customer?.email || '—'}</p>

        </div>
      </div>

      {/* Order Items Table */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-2">📦 Order Items</h3>
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Product</th>
              <th className="p-2 text-right">Price</th>
              <th className="p-2 text-center">Qty</th>
              <th className="p-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {cart.map((item, idx) => (
              <tr key={idx} className="border-t">
                <td className="p-2">{item.name}</td>
                <td className="p-2 text-right">₹{item.price.toLocaleString()}</td>
                <td className="p-2 text-center">{item.qty}</td>
                <td className="p-2 text-right">₹{(item.price * item.qty).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment Summary */}
      <div className="bg-gray-50 border rounded p-4 space-y-2 text-sm mt-6">
        <h3 className="font-semibold text-gray-800 mb-2">🧾 Payment Summary</h3>
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>₹{subtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Discount ({discountType})</span>
          <span>- ₹{appliedDiscount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax ({appliedTaxRate}%)</span>
          <span>₹{taxAmount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between font-bold text-base pt-2 border-t">
          <span>Grand Total</span>
          <span>₹{grandTotal.toLocaleString()}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-4 mt-6">
        <button className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">Download Invoice</button>
        <button className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">Print Invoice</button>
        <button
          onClick={() => {
            setCart([]);
            setCustomerName('');
            setCustomerPhone('');
            setCustomerEmail('');
            setShowInvoiceModal(false);
          }}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
        >
          Start New Order
        </button>
      </div>
    </div>
  </div>
)}

{/* Scanner Modal */}
{showQRScanner && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
    <div className="bg-white rounded shadow-lg p-6 w-full max-w-md text-sm relative">
      {/* Close Button */}
      <button
        onClick={() => setShowQRScanner(false)}
        className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl"
        aria-label="Close"
      >
        <FaTimes />
      </button>

      {/* Title */}
      <h2 className="text-lg font-semibold mb-2 text-center">Scan Product QR</h2>

      {/* Instructions */}
      <p className="text-center text-sm text-gray-600 mb-4">
        Hold the QR code steady in the center of the box. Once scanned, the product code will appear in the search bar.
      </p>

      {/* Scanner Container */}
      <div className="border rounded overflow-hidden">
        <div id="qr-reader" className="w-full h-64" />
      </div>
    </div>
  </div>
)}


</>
  )
}
