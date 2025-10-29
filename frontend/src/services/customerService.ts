const API_BASE = 'http://localhost:3001/api';

export const saveCustomer = async (customer: {
  name: string;
  email: string;
  phone: string;
  notes: string;
}) => {
  const res = await fetch(`${API_BASE}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer),
  });

  const data = await res.json();
  if (!data.success) throw new Error('Failed to save customer');
  return data.customer;
};
