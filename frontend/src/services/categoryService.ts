const API_BASE = import.meta.env.VITE_API_BASE_URL + '/categories';

export type Category = {
  _id?: string;
  name: string;
  description?: string;
};

export interface CategoriesResponse {
  success: boolean;
  categories?: Category[];
  data?: Category[];
  message?: string;
}

export const fetchCategories = async (): Promise<CategoriesResponse> => {
  const res = await fetch(`${API_BASE}`);
  
  if (!res.ok) {
    throw new Error('Failed to fetch categories');
  }

  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid category list response');
  }

  const data: CategoriesResponse = await res.json();
  return data;
};

export const createCategory = async (category: {
  name: string;
  description?: string;
}): Promise<{ success: boolean; category: Category; message?: string }> => {
  const res = await fetch(`${API_BASE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(category),
  });

  if (!res.ok) {
    throw new Error('Failed to create category');
  }

  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid create response');
  }

  return res.json();
};

export const updateCategory = async (id: string, updates: any): Promise<{ success: boolean; category: Category; message?: string }> => {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    throw new Error('Failed to update category');
  }

  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid update response');
  }

  return res.json();
};

export const deleteCategory = async (id: string): Promise<{ success: boolean; message?: string }> => {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    throw new Error('Failed to delete category');
  }

  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid delete response');
  }

  return res.json();
};