// Use import.meta.env for Vite
const API_BASE = import.meta.env.VITE_API_BASE_URL + '/auth';

export const loginUser = async (credentials: {
  email: string;
  password: string;
}) => {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  const contentType = res.headers.get('content-type');
  if (!res.ok || !contentType?.includes('application/json')) {
    throw new Error('Invalid login response');
  }

  return res.json();
};

export const registerUser = async (user: {
  email: string;
  password: string;
  role: 'admin' | 'staff';
  name?: string;
  phone?: string;
}) => {
  const res = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });

  const contentType = res.headers.get('content-type');
  if (!res.ok || !contentType?.includes('application/json')) {
    throw new Error('Invalid registration response');
  }

  return res.json();
};

export const fetchUsers = async () => {
  const res = await fetch(`${API_BASE}/users`);
  const contentType = res.headers.get('content-type');
  if (!res.ok || !contentType?.includes('application/json')) {
    throw new Error('Invalid user list response');
  }
  return res.json();
};

export const updateUser = async (id: string, updates: any) => {
  const res = await fetch(`${API_BASE}/users/${id}`, {
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

export const deleteUser = async (id: string) => {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: 'DELETE',
  });

  const contentType = res.headers.get('content-type');
  if (!res.ok || !contentType?.includes('application/json')) {
    throw new Error('Invalid delete response');
  }

  return res.json();
};