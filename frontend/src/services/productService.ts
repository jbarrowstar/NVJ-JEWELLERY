const API_BASE = import.meta.env.VITE_API_BASE_URL;

export type Product = {
  _id?: string;
  name: string;
  sku: string;
  category?: string;
  metal: 'gold' | 'silver';
  weight?: string;
  purity?: string;
  makingCharges?: number;
  wastage?: number;
  stonePrice?: number;
  costPrice?: number;
  price: number;
  description?: string;
  image?: string;
  qrCode?: string;
  available?: boolean;
};

export interface ProductsResponse {
  success: boolean;
  products: Product[];
  message?: string;
}

export interface ProductResponse {
  success: boolean;
  product: Product;
  message?: string;
}

export const fetchProducts = async (): Promise<Product[]> => {
  const res = await fetch(`${API_BASE}/products`);
  
  if (!res.ok) {
    throw new Error('Failed to fetch products');
  }

  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid products response');
  }

  const data: ProductsResponse = await res.json();
  
  if (!data.success) {
    throw new Error('Failed to fetch products');
  }

  return data.products;
};

export const fetchProductById = async (id: string): Promise<Product> => {
  const res = await fetch(`${API_BASE}/products/${id}`);
  
  if (!res.ok) {
    throw new Error('Failed to fetch product');
  }

  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid product response');
  }

  const data: ProductResponse = await res.json();
  
  if (!data.success) {
    throw new Error('Failed to fetch product');
  }

  return data.product;
};

export const fetchProductBySku = async (sku: string): Promise<Product> => {
  const res = await fetch(`${API_BASE}/products/sku/${sku}`);
  
  if (!res.ok) {
    throw new Error('Failed to fetch product');
  }

  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid product response');
  }

  const data: ProductResponse = await res.json();
  
  if (!data.success) {
    throw new Error('Failed to fetch product');
  }

  return data.product;
};

export const createProduct = async (product: Omit<Product, '_id' | 'sku' | 'qrCode'>): Promise<Product> => {
  const res = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  });

  if (!res.ok) {
    throw new Error('Failed to create product');
  }

  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid create product response');
  }

  const data: ProductResponse = await res.json();
  
  if (!data.success) {
    throw new Error('Failed to create product');
  }

  return data.product;
};

export const updateProduct = async (id: string, updates: Partial<Product>): Promise<Product> => {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    throw new Error('Failed to update product');
  }

  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid update product response');
  }

  const data: ProductResponse = await res.json();
  
  if (!data.success) {
    throw new Error('Failed to update product');
  }

  return data.product;
};

export const deleteProduct = async (id: string): Promise<{ success: boolean; message?: string }> => {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    throw new Error('Failed to delete product');
  }

  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid delete product response');
  }

  return res.json();
};

export const markProductAsSold = async (sku: string): Promise<{ success: boolean; message?: string }> => {
  const res = await fetch(`${API_BASE}/products/${sku}/mark-sold`, {
    method: 'PUT',
  });

  if (!res.ok) {
    throw new Error('Failed to mark product as sold');
  }

  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid mark sold response');
  }

  return res.json();
};

// Additional utility functions
export const searchProducts = async (query: string): Promise<Product[]> => {
  const res = await fetch(`${API_BASE}/products/search?q=${encodeURIComponent(query)}`);
  
  if (!res.ok) {
    throw new Error('Failed to search products');
  }

  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid search products response');
  }

  const data: ProductsResponse = await res.json();
  
  if (!data.success) {
    throw new Error('Failed to search products');
  }

  return data.products;
};

export const getProductStats = async (): Promise<{
  totalProducts: number;
  goldProducts: number;
  silverProducts: number;
  outOfStock: number;
}> => {
  const res = await fetch(`${API_BASE}/products/stats`);
  
  if (!res.ok) {
    throw new Error('Failed to fetch product stats');
  }

  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid product stats response');
  }

  const data = await res.json();
  
  if (!data.success) {
    throw new Error('Failed to fetch product stats');
  }

  return data.stats;
};

export const updateProductAvailability = async (id: string, available: boolean): Promise<Product> => {
  const res = await fetch(`${API_BASE}/products/${id}/availability`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ available }),
  });

  if (!res.ok) {
    throw new Error('Failed to update product availability');
  }

  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid update product availability response');
  }

  const data: ProductResponse = await res.json();
  
  if (!data.success) {
    throw new Error('Failed to update product availability');
  }

  return data.product;
};