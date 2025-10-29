import React from 'react';

const InvoiceContent = React.forwardRef<HTMLDivElement, {
  order: any;
  subtotal: number;
  appliedDiscount: number;
  appliedTaxRate: number;
  taxAmount: number;
  grandTotal: number;
}>(({ order, subtotal, appliedDiscount, appliedTaxRate, taxAmount, grandTotal }, ref) => {
  return (
    <div ref={ref} className="p-6 text-sm bg-white max-w-3xl mx-auto">
      <h2 className="text-xl font-bold text-center mb-4">🧾 Nirvaha Jewellers – Invoice</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p><strong>Name:</strong> {order?.customer?.name || '—'}</p>
          <p><strong>Phone:</strong> {order?.customer?.phone || '—'}</p>
          <p><strong>Email:</strong> {order?.customer?.email || '—'}</p>
        </div>
        <div>
          <p><strong>Invoice No:</strong> {order?.invoiceNumber || '—'}</p>
          <p><strong>Date:</strong> {order?.date || '—'}</p>
          <p><strong>Time:</strong> {order?.time || '—'}</p>
          <p><strong>Payment Mode:</strong> {order?.paymentMode || '—'}</p>
        </div>
      </div>

      <table className="w-full border text-sm mb-6">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Product</th>
            <th className="p-2 text-right">Price</th>
            <th className="p-2 text-center">Qty</th>
            <th className="p-2 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order?.items?.map((item: any, idx: number) => (
            <tr key={idx} className="border-t">
              <td className="p-2">{item.name}</td>
              <td className="p-2 text-right">₹{item.price.toLocaleString()}</td>
              <td className="p-2 text-center">{item.qty}</td>
              <td className="p-2 text-right">₹{(item.price * item.qty).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-1 text-right">
        <p><strong>Subtotal:</strong> ₹{subtotal.toLocaleString()}</p>
        <p><strong>Discount:</strong> - ₹{appliedDiscount.toLocaleString()}</p>
        <p><strong>Tax ({appliedTaxRate}%):</strong> ₹{taxAmount.toLocaleString()}</p>
        <p className="text-lg font-bold pt-2 border-t"><strong>Grand Total:</strong> ₹{grandTotal.toLocaleString()}</p>
      </div>

      <div className="mt-6 text-xs text-gray-600">
        <p>Goods once sold will not be taken back.</p>
        <p>Subject to jurisdiction only.</p>
        <p className="mt-4 text-right font-semibold">— Nirvaha Jewellers</p>
      </div>
    </div>
  );
});

export default InvoiceContent;
