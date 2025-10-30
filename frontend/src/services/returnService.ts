export async function checkReturnExists(orderId: string): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:3001/api/returns/check/${orderId}`);
    if (!res.ok) throw new Error('Failed to check return status');

    const data = await res.json();
    return data.exists === true;
  } catch (err) {
    console.error('Return check error:', err);
    return false;
  }
}
