const API_BASE = import.meta.env.VITE_API_BASE_URL;

export type OrderItem = {
  name: string;
  price: number;
  qty: number;
  sku: string;
  category?: string;
  metal?: string;
  costPrice?: number;
};

export type Order = {
  _id: string;
  orderId?: string;
  invoiceNumber: string;
  date: string;
  time: string;
  customer: {
    name: string;
    phone: string;
    email: string;
  };
  items: OrderItem[];
  discount?: number;
  tax?: number;
  grandTotal: number;
  paymentMode?: string;
  paymentMethods?: Array<{
    method: string;
    amount: number;
  }>;
  createdAt: string;
  status?: 'completed' | 'refunded' | 'cancelled';
};

export interface OrdersResponse {
  success: boolean;
  orders: Order[];
  message?: string;
}

export const fetchOrders = async (): Promise<OrdersResponse> => {
  const res = await fetch(`${API_BASE}/orders`);
  
  if (!res.ok) {
    throw new Error('Failed to fetch orders');
  }

  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid orders response');
  }

  return res.json();
};

export const fetchOrderById = async (id: string): Promise<{ success: boolean; order: Order }> => {
  const res = await fetch(`${API_BASE}/orders/${id}`);
  
  if (!res.ok) {
    throw new Error('Failed to fetch order');
  }

  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid order response');
  }

  return res.json();
};

export const saveOrder = async (order: Omit<Order, '_id'>): Promise<{ success: boolean; order: Order; message?: string }> => {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order),
  });

  if (!res.ok) {
    throw new Error('Failed to save order');
  }

  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid save order response');
  }

  return res.json();
};

export const updateOrder = async (id: string, updates: Partial<Order>): Promise<{ success: boolean; order: Order; message?: string }> => {
  const res = await fetch(`${API_BASE}/orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    throw new Error('Failed to update order');
  }

  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid update order response');
  }

  return res.json();
};

export const deleteOrder = async (id: string): Promise<{ success: boolean; message?: string }> => {
  const res = await fetch(`${API_BASE}/orders/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    throw new Error('Failed to delete order');
  }

  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid delete order response');
  }

  return res.json();
};