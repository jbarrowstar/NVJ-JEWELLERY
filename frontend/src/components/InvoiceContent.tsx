import React from 'react';
import logo from '../assets/logo.png';

const InvoiceContent = React.forwardRef<HTMLDivElement, {
  order: any;
  subtotal: number;
  grandTotal: number;
}>(({ order, subtotal, grandTotal }, ref) => {
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
          <p className="text-xs">Add Address</p>
          <p className="text-xs">Mobile: +91 9999999999 | Email: company@gmail.com</p>
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
          <p><strong>Date:</strong> {order?.date || '—'}</p>
          <p><strong>Time:</strong> {order?.time || '—'}</p>
          <p><strong>Payment Mode:</strong> {order?.paymentMode || '—'}</p>
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
          {order?.items?.map((item: any, idx: number) => (
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

      {/* Summary */}
      <div className="text-right text-sm space-y-1 mb-6">
        <p><strong>Subtotal:</strong> ₹{subtotal.toLocaleString()}</p>
        <p><strong>Discount:</strong> - ₹{order.discount?.toLocaleString() || '0'}</p>
        <p><strong>Tax:</strong> ₹{order.tax?.toLocaleString() || '0'}</p>
        <p className="text-lg font-bold text-[#CC9200] pt-2 border-t">
          Grand Total: ₹{grandTotal.toLocaleString()}
        </p>
        <p className="text-xs mt-2">Rs. {grandTotal.toLocaleString()} Only</p>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-600">
        <p>Terms and Conditions:</p>
        <ul className="list-disc ml-4">
          <li>Goods once sold will not be taken back.</li>
          <li>Subject to jurisdiction only.</li>
        </ul>
        <p className="mt-4 text-right font-semibold">— Nirvaha Jewellers</p>
      </div>
    </div>
  );
});

export default InvoiceContent;
