const API_BASE = 'http://localhost:3001/api/auth';

export const loginUser = async (credentials: {
  email: string;
  password: string;
}) => {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  return res.json();
};
