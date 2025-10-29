export async function saveOrder(order: any) {
  try {
    const res = await fetch('http://localhost:3001/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Order save error:', err);
    return { success: false };
  }
}
