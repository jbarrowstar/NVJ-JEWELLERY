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
    <div
      ref={ref}
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '20mm',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#fff',
        color: '#000',
      }}
    >
      <h2 style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'center', marginBottom: '16px' }}>
        🧾 Nirvaha Jewellers – Invoice
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
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

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginBottom: '24px' }}>
        <thead style={{ backgroundColor: '#f3f3f3' }}>
          <tr>
            <th style={{ padding: '8px', textAlign: 'left', border: '1px solid #ccc' }}>Product</th>
            <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #ccc' }}>Price</th>
            <th style={{ padding: '8px', textAlign: 'center', border: '1px solid #ccc' }}>Qty</th>
            <th style={{ padding: '8px', textAlign: 'right', border: '1px solid #ccc' }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order?.items?.map((item: any, idx: number) => (
            <tr key={idx}>
              <td style={{ padding: '8px', border: '1px solid #ccc' }}>{item.name}</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ccc' }}>
                ₹{item.price.toLocaleString()}
              </td>
              <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ccc' }}>{item.qty}</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ccc' }}>
                ₹{(item.price * item.qty).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ textAlign: 'right', fontSize: '14px', lineHeight: '1.6' }}>
        <p><strong>Subtotal:</strong> ₹{subtotal.toLocaleString()}</p>
        <p><strong>Discount:</strong> - ₹{appliedDiscount.toLocaleString()}</p>
        <p><strong>Tax ({appliedTaxRate}%):</strong> ₹{taxAmount.toLocaleString()}</p>
        <p style={{ fontSize: '16px', fontWeight: 'bold', paddingTop: '8px', borderTop: '1px solid #ccc' }}>
          <strong>Grand Total:</strong> ₹{grandTotal.toLocaleString()}
        </p>
      </div>

      <div style={{ marginTop: '32px', fontSize: '12px', color: '#555' }}>
        <p>Goods once sold will not be taken back.</p>
        <p>Subject to jurisdiction only.</p>
        <p style={{ marginTop: '16px', textAlign: 'right', fontWeight: 'bold' }}>— Nirvaha Jewellers</p>
      </div>
    </div>
  );
});

export default InvoiceContent;
