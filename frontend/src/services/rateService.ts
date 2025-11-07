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

export const fetchRates = async (): Promise<Rates> => {
  const res = await fetch('http://localhost:3001/api/rates');
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
