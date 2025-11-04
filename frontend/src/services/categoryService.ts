const API_BASE = 'http://localhost:3001/api/categories';

export const fetchCategories = async () => {
  const res = await fetch(`${API_BASE}`);
  const contentType = res.headers.get('content-type');
  if (!res.ok || !contentType?.includes('application/json')) {
    throw new Error('Invalid category list response');
  }
  return res.json();
};

export const createCategory = async (category: {
  name: string;
  description?: string;
}) => {
  const res = await fetch(`${API_BASE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(category),
  });

  const contentType = res.headers.get('content-type');
  if (!res.ok || !contentType?.includes('application/json')) {
    throw new Error('Invalid create response');
  }

  return res.json();
};

export const updateCategory = async (id: string, updates: any) => {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  const contentType = res.headers.get('content-type');
  if (!res.ok || !contentType?.includes('application/json')) {
    throw new Error('Invalid update response');
  }

  return res.json();
};

export const deleteCategory = async (id: string) => {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });

  const contentType = res.headers.get('content-type');
  if (!res.ok || !contentType?.includes('application/json')) {
    throw new Error('Invalid delete response');
  }

  return res.json();
};
