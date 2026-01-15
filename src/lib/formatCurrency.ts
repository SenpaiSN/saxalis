export function formatCurrency(value: number | string, currency?: string | null, locale?: string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  // Prefer the explicit parameters, otherwise try to read user preferences from localStorage (safe for SSR)
  let curr = currency ?? undefined;
  let loc = locale ?? 'fr-FR';
  try {
    if (!curr && typeof window !== 'undefined') {
      const stored = localStorage.getItem('currency');
      if (stored) curr = stored;
    }
    if (!locale && typeof window !== 'undefined') {
      const storedLocale = localStorage.getItem('locale');
      if (storedLocale) loc = storedLocale;
    }
  } catch (e) {
    // ignore localStorage errors
  }

  if (curr) curr = String(curr).toUpperCase();

  // Decide how to display currency symbol
  // - For EUR we use symbol (€)
  // - For others (e.g., XOF) we prefer code (XOF)
  const currencyDisplay = (curr === 'EUR' ? 'symbol' : 'code') as 'symbol' | 'code' | undefined;

  // For currencies with no minor units (like XOF), use 0 fraction digits
  const zeroFractionCurrencies = new Set(['XOF', 'JPY']);
  const minimumFractionDigits = zeroFractionCurrencies.has(curr ?? '') ? 0 : 2;
  const maximumFractionDigits = zeroFractionCurrencies.has(curr ?? '') ? 0 : 2;

  try {
    // Special-case: force code display for XOF to avoid locale-specific symbol (e.g. "F CFA")
    if (curr === 'XOF') {
      const formattedNumber = new Intl.NumberFormat(loc, { minimumFractionDigits, maximumFractionDigits }).format(isNaN(num) ? 0 : num);
      return `${formattedNumber} XOF`;
    }

    return new Intl.NumberFormat(loc, {
      style: 'currency',
      currency: curr ?? 'EUR',
      currencyDisplay: currencyDisplay,
      minimumFractionDigits,
      maximumFractionDigits
    }).format(isNaN(num) ? 0 : num);
  } catch (e) {
    // Fallback simple formatting
    const n = isNaN(num) ? 0 : num;
    const s = n.toFixed(minimumFractionDigits);
    if (curr === 'EUR') return `${s} €`;
    if (curr) return `${s} ${curr}`;
    return `${s} €`;
  }
}

export default formatCurrency;