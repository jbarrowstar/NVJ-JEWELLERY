export type Product = {
  _id?: string;
  name: string;
  price: number;
  sku: string;
  image?: string;
  category?: string;
  weight?: string;
  purity?: string;
  description?: string;
  qrCode?: string;
  stock?: number;
};

const API_BASE = 'http://localhost:3001/api/products';

export const fetchProducts = async (): Promise<Product[]> => {
  const res = await fetch(API_BASE);
  const data = await res.json();
  if (!data.success) throw new Error('Failed to fetch products');
  return data.products;
};

export const createProduct = async (product: Product): Promise<Product> => {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  });
  const data = await res.json();
  if (!data.success) throw new Error('Failed to create product');
  return data.product;
};

export const updateProduct = async (id: string, updates: Product): Promise<Product> => {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!data.success) throw new Error('Failed to update product');
  return data.product;
};

export const deleteProduct = async (id: string): Promise<{ success: boolean }> => {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!data.success) throw new Error('Failed to delete product');
  return data;
};
