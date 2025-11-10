import React from 'react';
import logo from '../assets/logo.png';

type PaymentDetail = {
  method: string;
  amount: number;
};

type OrderItem = {
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

type Order = {
  orderId?: string;
  invoiceNumber?: string;
  customer?: Customer;
  items?: OrderItem[];
  paymentMethods?: PaymentDetail[];
  paymentMode?: string;
  discount?: number;
  tax?: number;
  date?: string;
  time?: string;
};

const InvoiceContent = React.forwardRef<HTMLDivElement, {
  order: Order;
  subtotal: number;
  grandTotal: number;
}>(({ order, subtotal, grandTotal }, ref) => {
  const totalPaid = order?.paymentMethods?.reduce((sum: number, p: PaymentDetail) => sum + p.amount, 0) || 0;
  const balance = grandTotal - totalPaid;

  return (
    <div
      ref={ref}
      className="w-[210mm] min-h-[297mm] p-[20mm] bg-white text-black font-sans text-sm leading-relaxed"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <img src={logo} alt="Nirvaha Jewellers" className="h-16 object-contain" />
        <div className="text-right">
          <h1 className="text-2xl font-bold text-[#CC9200]">NIRVAHA JEWELLERS</h1>
          <p className="text-xs">Bazar Street, Mulbagal, Kolar District - 563131</p>
          <p className="text-xs">Mobile: +91 9035325551 | Email: nirvahajewellery@gmail.com</p>
          <p className="text-xs">GSTIN: 29AAAAA1234F000 | PAN: 29AAAAA1234F</p>
        </div>
      </div>

      {/* Invoice Metadata */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="font-semibold mb-2">Billing Details</h2>
          <p><strong>Name:</strong> {order?.customer?.name || '—'}</p>
          <p><strong>Mobile:</strong> {order?.customer?.phone || '—'}</p>
          <p><strong>Email:</strong> {order?.customer?.email || '—'}</p>
        </div>
        <div>
          <h2 className="font-semibold mb-2">Invoice Info</h2>
          <p><strong>Invoice No:</strong> {order?.invoiceNumber || '—'}</p>
          <p><strong>Order ID:</strong> {order?.orderId || '—'}</p>
          <p><strong>Date:</strong> {order?.date || '—'}</p>
          <p><strong>Time:</strong> {order?.time || '—'}</p>
        </div>
      </div>

      {/* Item Table */}
      <table className="w-full border-collapse mb-6 text-xs">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2 text-left">Sr.</th>
            <th className="border p-2 text-left">Item Description</th>
            <th className="border p-2 text-center">Qty</th>
            <th className="border p-2 text-center">Unit</th>
            <th className="border p-2 text-right">List Price</th>
            <th className="border p-2 text-right">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {order?.items?.map((item: OrderItem, idx: number) => (
            <tr key={idx}>
              <td className="border p-2">{idx + 1}</td>
              <td className="border p-2">{item.name}</td>
              <td className="border p-2 text-center">{item.qty}</td>
              <td className="border p-2 text-center">N.A.</td>
              <td className="border p-2 text-right">₹{item.price.toLocaleString()}</td>
              <td className="border p-2 text-right">₹{(item.price * item.qty).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Payment Summary */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Left: Amount Summary */}
        <div className="text-sm space-y-1">
          <h3 className="font-semibold mb-2">Amount Summary</h3>
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>₹{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Discount:</span>
            <span>- ₹{(order.discount || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>GST:</span>
            <span>₹{(order.tax || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-2 border-t">
            <span>Grand Total:</span>
            <span>₹{grandTotal.toLocaleString()}</span>
          </div>
          <p className="text-xs mt-2 text-right">Rs. {grandTotal.toLocaleString()} Only</p>
        </div>

        {/* Right: Payment Details */}
        <div className="text-sm space-y-1">
          <h3 className="font-semibold mb-2">Payment Details</h3>
          {order?.paymentMethods?.map((payment: PaymentDetail, index: number) => (
            <div key={index} className="flex justify-between">
              <span>{payment.method}:</span>
              <span>₹{payment.amount.toLocaleString()}</span>
            </div>
          ))}
          <div className="flex justify-between font-semibold border-t pt-2">
            <span>Total Paid:</span>
            <span>₹{totalPaid.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>
              {balance < 0 ? 'Change' : balance > 0 ? 'Balance Due' : 'Paid in Full'}
            </span>
            <span className={balance < 0 ? 'text-green-600' : balance > 0 ? 'text-red-600' : 'text-gray-600'}>
              ₹{Math.abs(balance).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-600 mt-8">
        <p className="font-semibold mb-2">Terms and Conditions:</p>
        <ul className="list-disc ml-4 space-y-1">
          <li>Goods once sold will not be taken back or exchanged.</li>
          <li>All disputes are subject to Mulbagal jurisdiction only.</li>
          <li>This is a computer generated invoice.</li>
        </ul>
        <div className="mt-6 flex justify-between items-end">
          <div>
            <p className="mb-1">Customer Signature</p>
            <div className="border-t border-gray-400 w-48 pt-1"></div>
          </div>
          <div className="text-right">
            <p className="font-semibold">For Nirvaha Jewellers</p>
            <div className="border-t border-gray-400 w-48 pt-1 mt-1"></div>
            <p className="mt-2">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
});

InvoiceContent.displayName = 'InvoiceContent';

export default InvoiceContent;