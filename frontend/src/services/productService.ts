const API_BASE = 'http://localhost:3001/api';

export const fetchProducts = async () => {
  const res = await fetch(`${API_BASE}/products`);
  const data = await res.json();
  if (!data.success) throw new Error('Failed to fetch products');
  return data.products;
};
