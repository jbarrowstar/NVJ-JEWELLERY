import { useState, useEffect, type JSX, useCallback } from 'react';
import Layout from '../components/Layout';
import { fetchProducts } from '../services/productService';
import { saveCustomer } from '../services/customerService';
import { saveOrder } from '../services/orderService';
import { AiOutlineDelete, AiOutlineProduct } from 'react-icons/ai';
import { FaShoppingCart, FaUser, FaPercentage, FaCalculator, FaTimes } from 'react-icons/fa';
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
    <div className="flex items-center gap-2 text-lg font-semibold text-gray-800 mb-2">
      <div className="text-[#CC9200]">{icon}</div>
      <span>{title}</span>
    </div>
  );
}

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

  useEffect(() => {
    fetchProducts()
      .then((items) => {
        const safeItems = items
          .filter((item) => item.available !== false && typeof item.image === 'string')
          .map((item) => ({
            name: item.name,
            price: item.price,
            image: item.image as string,
            sku: item.sku,
            available: item.available,
          }));
        setSuggestedItems(safeItems);
        setFilteredItems(safeItems);

        const fuse = new Fuse(safeItems, {
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

    // Fetch current customers from API to check for duplicates
    const customersResponse = await fetch('http://localhost:3001/api/customers');
    const customersData = await customersResponse.json();
    
    if (customersData.success) {
      const isDuplicatePhone = customersData.customers.some(
        (c: Customer) => c.phone.trim() === trimmedPhone
      );

      if (isDuplicatePhone) {
        toast.error('Customer with this phone number already exists.');
        return;
      }
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
    
    // Refresh customer list
    const updatedCustomers = await fetch('http://localhost:3001/api/customers');
    const updatedData = await updatedCustomers.json();
    if (updatedData.success) {
      setCustomerList(updatedData.customers);
    }
  } catch (err) {
    console.error('Customer save error:', err);
    toast.error('Server error');
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
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    try {
      const res = await saveOrder(order);
      if (res.success) {
        toast.success(`Order saved! No: ${res.order.orderId}`);
        setLastOrder(res.order);
        setShowPaymentModal(false);
        setShowInvoiceModal(true);

        await Promise.all(
          cart.map((item) =>
            fetch(`http://localhost:3001/api/products/${item.sku}/mark-sold`, {
              method: 'PUT',
            })
          )
        );

        // Refresh product list after marking sold
        fetchProducts()
          .then((items: Product[]) => {
            const safeItems = items
              .filter((item) => item.available !== false && typeof item.image === 'string')
              .map((item) => ({
                name: item.name,
                price: item.price,
                image: item.image as string,
                sku: item.sku,
                available: item.available,
              }));

            setSuggestedItems(safeItems);
            setFilteredItems(safeItems);
            setProductFuse(new Fuse(safeItems, { keys: ['name', 'sku'], threshold: 0.3 }));
          })
          .catch((err) => console.error('Product refresh error:', err));

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
    // Create a completely new HTML structure with basic styling
    const createPDFContent = () => {
      const container = document.createElement('div');
      container.style.fontFamily = 'Arial, sans-serif';
      container.style.fontSize = '12px';
      container.style.color = '#000000';
      container.style.backgroundColor = '#ffffff';
      container.style.padding = '20px';
      container.style.width = '210mm'; // A4 width

      // Add company header
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

      // Add order info in two columns
      const infoSection = document.createElement('div');
      infoSection.style.display = 'flex';
      infoSection.style.justifyContent = 'space-between';
      infoSection.style.marginBottom = '20px';
      infoSection.style.gap = '20px';

      // Order Information
      const orderInfo = document.createElement('div');
      orderInfo.style.flex = '1';
      orderInfo.innerHTML = `
        <h3 style="margin: 0 0 10px 0; font-size: 16px; border-bottom: 1px solid #000; padding-bottom: 5px;">Order Information</h3>
        <p style="margin: 5px 0;"><strong>Order ID:</strong> ${lastOrder?.orderId || '—'}</p>
        <p style="margin: 5px 0;"><strong>Invoice No:</strong> ${lastOrder?.invoiceNumber || '—'}</p>
        <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
      `;

      // Customer Information
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

      // Add items table
      const tableSection = document.createElement('div');
      tableSection.style.marginBottom = '20px';
      
      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.marginBottom = '10px';
      
      // Table header
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

      // Table body
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

      // Add payment summary
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
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
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

      // Add payment methods
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

      // Add footer
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
                  placeholder="Scan or search by name or SKU..."
                  className="border p-2 rounded w-full"
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

              {/* Products scrollable */}
              <div
                className="overflow-y-auto pr-2" 
                role="region"
                aria-label="Product suggestions (scrollable)"
                style={{ maxHeight: '540px' }}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {filteredItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="border rounded shadow-sm p-2 bg-white flex flex-col items-center text-center"
                    >
                      <img
                        src={item.image ? `http://localhost:3001${item.image}` : '/default.jpg'}
                        alt={item.name}
                        className="h-24 w-24 object-cover rounded mb-2"
                      />

                      <span className="font-semibold text-sm">{item.name}</span>
                      <span className="text-sm text-gray-600 mb-2">
                        ₹{item.price.toLocaleString()}
                      </span>
                      <button
                        onClick={() => handleAddItem(item.name, item.price, item.sku)}
                        disabled={item.available === false || cart.some((c) => c.sku === item.sku)}
                        className={`px-3 py-1 rounded text-sm ${
                          item.available === false || cart.some((c) => c.sku === item.sku)
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-[#CC9200] text-white hover:bg-yellow-500'
                        }`}
                      >
                        {item.available === false
                          ? 'Sold Out'
                          : cart.some((c) => c.sku === item.sku)
                          ? 'Added'
                          : 'Add'}
                      </button>
                    </div>
                  ))}
                </div>
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

              {/* Discount Input */}
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

              {/* Discount Type Toggle */}
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

              {/* Tax Input */}
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#99A1AF]/90">
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
              <input type="tel" placeholder="Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full border p-2 rounded" />
              <input type="email" placeholder="Email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className="w-full border p-2 rounded" />
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#99A1AF]/90">
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#99A1AF]/90">
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
                <h2 className="text-lg font-semibold text-center">Select Payment Methods</h2>
                
                {(['Cash', 'Card', 'UPI', 'Bank Transfer', 'Wallet'] as PaymentMethod[]).map((method) => {
                  const isSelected = selectedPaymentMethods.some(p => p.method === method);
                  const amount = paymentAmount[method] || 0;
                  
                  return (
                    <div key={method} className="border rounded p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
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
                            className="w-4 h-4"
                          />
                          <span className="font-medium">{method}</span>
                        </label>
                      </div>
                      
                      {isSelected && (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">₹</span>
                          <input
                            type="number"
                            placeholder="Amount"
                            value={amount}
                            onChange={(e) => {
                              const value = Number(e.target.value);
                              setPaymentAmount(prev => ({
                                ...prev,
                                [method]: value
                              }));
                              // Update the selected payment methods array
                              setSelectedPaymentMethods(prev =>
                                prev.map(p =>
                                  p.method === method ? { ...p, amount: value } : p
                                )
                              );
                            }}
                            className="w-full p-2 border rounded text-right"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Total Paid Display */}
                {selectedPaymentMethods.length > 0 && (
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between font-semibold">
                      <span>Total Paid:</span>
                      <span>₹{totalPaid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span>Balance:</span>
                      <span className={balance < 0 ? 'text-green-600' : balance > 0 ? 'text-red-600' : 'text-gray-600'}>
                        ₹{Math.abs(balance).toLocaleString()}
                        {balance < 0 ? ' (Change)' : balance > 0 ? ' (Due)' : ' (Paid)'}
                      </span>
                    </div>
                  </div>
                )}
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
                  <div className="flex justify-between font-bold text-base pt-2 border-t">
                    <span>Grand Total</span>
                    <span>₹{grandTotal.toLocaleString()}</span>
                  </div>
                </div>
                
                <button
                  className="w-full bg-[#CC9200] hover:bg-yellow-500 text-white py-2 rounded mt-4"
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#99A1AF]/90 pt-10">
          <div className="bg-white shadow-xl p-6 text-sm relative max-h-[80vh] overflow-y-auto">
            <button
              onClick={() => setShowInvoiceModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl"
              aria-label="Close"
            >
              <FaTimes />
            </button>
            <h2 className="text-xl font-semibold mb-6 text-center">Order Details – Invoice</h2>

            {/* Order Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 border rounded p-4 space-y-2">
                <h3 className="font-semibold text-gray-800 mb-2">🛒 Order Info</h3>
                <p><strong>Order ID:</strong> {lastOrder?.orderId || '—'}</p>
                <p><strong>Invoice No:</strong> {lastOrder?.invoiceNumber || '—'}</p>
                <p className="font-bold text-lg pt-2"><strong>Grand Total:</strong> ₹{grandTotal.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 border rounded p-4 space-y-2">
                <h3 className="font-semibold text-gray-800 mb-2">👤 Customer Info</h3>
                <p><strong>Name:</strong> {lastOrder?.customer?.name || '—'}</p>
                <p><strong>Phone:</strong> {lastOrder?.customer?.phone || '—'}</p>
                <p><strong>Email:</strong> {lastOrder?.customer?.email || '—'}</p>
              </div>
            </div>

            {/* Order Items */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">📦 Order Items</h3>
              <div className="max-h-40 overflow-y-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0 z-10">
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
            </div>

            {/* Payment Details */}
            <div className="bg-gray-50 border rounded p-4 space-y-2 text-sm mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">💳 Payment Details</h3>
              
              {/* Show individual payment methods */}
              {lastOrder?.paymentMethods?.map((payment: PaymentDetail, index: number) => (
                <div key={index} className="flex justify-between">
                  <span>{payment.method}</span>
                  <span>₹{payment.amount.toLocaleString()}</span>
                </div>
              ))}
              
              {/* Total paid */}
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total Paid</span>
                <span>₹{lastOrder?.paymentMethods?.reduce((sum: number, p: PaymentDetail) => sum + p.amount, 0).toLocaleString()}</span>
              </div>
              
              {/* Balance/Change */}
              <div className="flex justify-between text-sm">
                <span>
                  {lastOrder && lastOrder.paymentMethods?.reduce((sum: number, p: PaymentDetail) => sum + p.amount, 0) >= lastOrder.grandTotal 
                    ? 'Change' 
                    : 'Balance Due'
                  }
                </span>
                <span className={
                  lastOrder && lastOrder.paymentMethods?.reduce((sum: number, p: PaymentDetail) => sum + p.amount, 0) >= lastOrder.grandTotal 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }>
                  ₹{Math.abs((lastOrder?.grandTotal || 0) - (lastOrder?.paymentMethods?.reduce((sum: number, p: PaymentDetail) => sum + p.amount, 0) || 0)).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-gray-50 border rounded p-4 space-y-2 text-sm">
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
            <div className="flex justify-end gap-4 mt-6">
              <button onClick={handleDownloadPDF} className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
                Download Invoice
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Print Invoice
              </button>
              <button
                onClick={resetOrder}
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
              >
                Start New Order
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}