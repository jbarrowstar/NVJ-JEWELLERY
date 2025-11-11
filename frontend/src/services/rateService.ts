const API_BASE = import.meta.env.VITE_API_BASE_URL;

export type GoldPurities = '24K' | '22K' | '18K';

export type RateItem = {
  metal: string;
  purity?: GoldPurities | null;
  price: number;
  updatedAt?: string;
};

export type Rates = {
  gold: { '24K': number; '22K': number; '18K': number };
  silver: number;
  raw?: RateItem[];
};

export interface RatesResponse {
  success: boolean;
  rates: RateItem[];
}

export const fetchRates = async (): Promise<Rates> => {
  const res = await fetch(`${API_BASE}/rates`);
  
  if (!res.ok) {
    throw new Error('Failed to fetch rates');
  }

  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid rates response');
  }

  const data = await res.json();
  
  if (!data.success || !Array.isArray(data.rates)) {
    throw new Error('Failed to fetch rates');
  }

  const gold: Rates['gold'] = { '24K': 0, '22K': 0, '18K': 0 };
  let silver = 0;

  for (const r of data.rates) {
    const metal = r.metal?.toLowerCase();
    const price = Number(r.price ?? 0);
    const purity = r.purity?.toUpperCase() as GoldPurities | undefined;

    if (metal === 'gold' && purity) gold[purity] = price;
    if (metal === 'silver') silver = price;
  }

  return { gold, silver, raw: data.rates };
};

export const updateRate = async (
  metal: 'gold' | 'silver',
  price: number,
  purity: GoldPurities | null = null
): Promise<{ success: boolean; rate: RateItem }> => {
  const res = await fetch(`${API_BASE}/rates/${metal}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ price, purity }),
  });

  if (!res.ok) {
    throw new Error('Failed to update rate');
  }

  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid update rate response');
  }

  return res.json();
};