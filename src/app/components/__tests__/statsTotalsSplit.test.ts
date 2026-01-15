import { computeTotals } from '../statsUtils';

describe('computeTotals split real vs forecast', () => {
  it('separates past (incl today) and future transactions correctly', () => {
    const today = new Date();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).toISOString().slice(0,10);
    const todayStr = today.toISOString().slice(0,10);
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString().slice(0,10);
    const beyond = new Date(today.getFullYear(), today.getMonth() + 4, today.getDate()).toISOString().slice(0,10); // > +3 months

    const sample = [
      { id: 1, date: yesterday, montant: 1000, type: 'revenu' }, // real revenu
      { id: 2, date: todayStr, montant: -200, type: 'dépense' }, // real depense
      { id: 3, date: tomorrow, montant: 500, type: 'revenu' }, // forecast revenu (within 3 months)
      { id: 4, date: tomorrow, montant: -100, type: 'dépense' }, // forecast depense (within 3 months)
      { id: 5, date: beyond, montant: 9999, type: 'revenu' } // beyond 3 months, should NOT be counted as forecast
    ] as any;

    const totals = computeTotals(sample, []);
    expect(totals.revenus.real).toBe(1000);
    expect(totals.revenus.forecast).toBe(500); // unchanged: beyond is NOT part of forecast
    expect(totals.revenus.total).toBe(1000 + 500 + 9999);
    expect(totals.depenses.real).toBe(200);
    expect(totals.depenses.forecast).toBe(100);
    expect(totals.resteADepenserReal).toBe(800);
    expect(totals.resteADepenserAll).toBe(11199); // (1000+500+9999) - (200+100)
  });

  it('ignores aggregated "Total général" rows from totals', () => {
    const sampleWithTotal = [
      { id: 1, date: new Date().toISOString().slice(0,10), montant: 1000, type: 'revenu' },
      { id: 2, date: new Date().toISOString().slice(0,10), montant: 5000, type: 'revenu', categorie: 'Total général' }
    ] as any;
    const totals = computeTotals(sampleWithTotal, []);
    // the total général revenue must be excluded
    expect(totals.revenus.real).toBe(1000);
    expect(totals.revenus.total).toBe(1000);
  });

  it('treats "Objectif" category as a dépense and excludes it from savings', () => {
    const today = new Date().toISOString().slice(0,10);
    const sample = [
      { id: 1, date: today, montant: 1000, type: 'revenu' },
      // this is an epargne-style tx but category 'Objectif' -> should be treated as depense
      { id: 2, date: today, montant: -200, type: 'épargne', categorie: 'Objectif' },
      // normal savings should still count as savings
      { id: 3, date: today, montant: -50, type: 'épargne', categorie: 'Épargne' }
    ] as any;
    const totals = computeTotals(sample, []);
    // Objectif tx must be counted as depense
    expect(totals.depenses.real).toBe(200);
    // but it should not be included in epargne
    expect(totals.epargne.real).toBe(-50);
    // resteADepenserReal = 1000 - 200 - (-50) = 850
    expect(totals.resteADepenserReal).toBe(850);
  });
});