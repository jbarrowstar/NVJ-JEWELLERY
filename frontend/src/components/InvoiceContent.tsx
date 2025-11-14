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
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '20mm',
        backgroundColor: 'white',
        color: 'black',
        fontFamily: 'sans-serif',
        fontSize: '14px',
        lineHeight: '1.6'
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <img 
          src={logo} 
          alt="Nirvaha Jewellers" 
          style={{
            height: '64px',
            objectFit: 'contain'
          }} 
        />
        <div style={{ textAlign: 'right' }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#CC9200',
            margin: '0 0 4px 0'
          }}>
            NIRVAHA JEWELLERS
          </h1>
          <p style={{
            fontSize: '12px',
            margin: '2px 0'
          }}>
            Bazar Street, Mulbagal, Kolar District - 563131
          </p>
          <p style={{
            fontSize: '12px',
            margin: '2px 0'
          }}>
            Mobile: +91 9035325551 | Email: nirvahajewellery@gmail.com
          </p>
          <p style={{
            fontSize: '12px',
            margin: '2px 0'
          }}>
            GSTIN: 29AQXPA1757F2ZI
          </p>
        </div>
      </div>

      {/* Invoice Metadata */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
        marginBottom: '24px'
      }}>
        <div>
          <h2 style={{
            fontWeight: '600',
            marginBottom: '8px',
            fontSize: '16px'
          }}>
            Billing Details
          </h2>
          <p style={{ margin: '4px 0' }}><strong>Name:</strong> {order?.customer?.name || '—'}</p>
          <p style={{ margin: '4px 0' }}><strong>Mobile:</strong> {order?.customer?.phone || '—'}</p>
          <p style={{ margin: '4px 0' }}><strong>Email:</strong> {order?.customer?.email || '—'}</p>
        </div>
        <div>
          <h2 style={{
            fontWeight: '600',
            marginBottom: '8px',
            fontSize: '16px'
          }}>
            Invoice Info
          </h2>
          <p style={{ margin: '4px 0' }}><strong>Invoice No:</strong> {order?.invoiceNumber || '—'}</p>
          <p style={{ margin: '4px 0' }}><strong>Order ID:</strong> {order?.orderId || '—'}</p>
          <p style={{ margin: '4px 0' }}><strong>Date:</strong> {order?.date || '—'}</p>
          <p style={{ margin: '4px 0' }}><strong>Time:</strong> {order?.time || '—'}</p>
        </div>
      </div>

      {/* Item Table */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        marginBottom: '24px',
        fontSize: '12px'
      }}>
        <thead style={{ backgroundColor: '#f3f4f6' }}>
          <tr>
            <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'left', fontWeight: '600' }}>Sr.</th>
            <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'left', fontWeight: '600' }}>Item Description</th>
            <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center', fontWeight: '600' }}>Qty</th>
            <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center', fontWeight: '600' }}>Unit</th>
            <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'right', fontWeight: '600' }}>List Price</th>
            <th style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'right', fontWeight: '600' }}>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {order?.items?.map((item: OrderItem, idx: number) => (
            <tr key={idx}>
              <td style={{ border: '1px solid #d1d5db', padding: '8px' }}>{idx + 1}</td>
              <td style={{ border: '1px solid #d1d5db', padding: '8px' }}>{item.name}</td>
              <td style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center' }}>{item.qty}</td>
              <td style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'center' }}>N.A.</td>
              <td style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'right' }}>₹{item.price.toLocaleString()}</td>
              <td style={{ border: '1px solid #d1d5db', padding: '8px', textAlign: 'right' }}>₹{(item.price * item.qty).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Payment Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
        marginBottom: '24px'
      }}>
        {/* Left: Amount Summary */}
        <div style={{ fontSize: '14px' }}>
          <h3 style={{
            fontWeight: '600',
            marginBottom: '8px',
            fontSize: '16px'
          }}>
            Amount Summary
          </h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>Subtotal:</span>
              <span>₹{subtotal.toLocaleString()}</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>Discount:</span>
              <span>- ₹{(order.discount || 0).toLocaleString()}</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>GST:</span>
              <span>₹{(order.tax || 0).toLocaleString()}</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 'bold',
              fontSize: '16px',
              paddingTop: '8px',
              borderTop: '1px solid #d1d5db',
              marginTop: '4px'
            }}>
              <span>Grand Total:</span>
              <span>₹{grandTotal.toLocaleString()}</span>
            </div>
            <p style={{
              fontSize: '12px',
              textAlign: 'right',
              marginTop: '8px',
              marginBottom: '0'
            }}>
              Rs. {grandTotal.toLocaleString()} Only
            </p>
          </div>
        </div>

        {/* Right: Payment Details */}
        <div style={{ fontSize: '14px' }}>
          <h3 style={{
            fontWeight: '600',
            marginBottom: '8px',
            fontSize: '16px'
          }}>
            Payment Details
          </h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            {order?.paymentMethods?.map((payment: PaymentDetail, index: number) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>{payment.method}:</span>
                <span>₹{payment.amount.toLocaleString()}</span>
              </div>
            ))}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: '600',
              paddingTop: '8px',
              borderTop: '1px solid #d1d5db',
              marginTop: '4px'
            }}>
              <span>Total Paid:</span>
              <span>₹{totalPaid.toLocaleString()}</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '14px',
              marginTop: '4px'
            }}>
              <span>
                {balance < 0 ? 'Change' : balance > 0 ? 'Balance Due' : 'Paid in Full'}
              </span>
              <span style={{
                fontWeight: '600',
                color: balance < 0 ? '#059669' : balance > 0 ? '#dc2626' : '#6b7280'
              }}>
                ₹{Math.abs(balance).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        fontSize: '12px',
        color: '#6b7280',
        marginTop: '32px'
      }}>
        <p style={{
          fontWeight: '600',
          marginBottom: '8px',
          color: '#374151'
        }}>
          Terms and Conditions:
        </p>
        <ul style={{
          listStyleType: 'disc',
          marginLeft: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          padding: '0'
        }}>
          <li>Goods once sold will not be taken back or exchanged.</li>
          <li>All disputes are subject to Mulbagal jurisdiction only.</li>
          <li>This is a computer generated invoice.</li>
        </ul>
        <div style={{
          marginTop: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end'
        }}>
          <div>
            <p style={{ marginBottom: '4px' }}>Customer Signature</p>
            <div style={{
              borderTop: '1px solid #9ca3af',
              width: '192px',
              paddingTop: '4px'
            }}></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontWeight: '600', marginBottom: '4px' }}>For Nirvaha Jewellers</p>
            <div style={{
              borderTop: '1px solid #9ca3af',
              width: '192px',
              paddingTop: '4px',
              marginBottom: '8px'
            }}></div>
            <p>Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
});

InvoiceContent.displayName = 'InvoiceContent';

export default InvoiceContent;