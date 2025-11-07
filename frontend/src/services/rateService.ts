// services/rateService.ts
export const fetchRates = async (): Promise<{ gold: number; silver: number }> => {
  const res = await fetch('http://localhost:3001/api/rates');
  const data = await res.json();
  if (!data.success) throw new Error('Failed to fetch rates');

  const gold = data.rates.find((r: any) => r.metal === 'gold')?.price ?? 0;
  const silver = data.rates.find((r: any) => r.metal === 'silver')?.price ?? 0;

  return { gold, silver };
};
