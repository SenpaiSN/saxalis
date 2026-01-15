import { describe, it, expect } from 'vitest';
import { aggregateMonthlyEvolution, aggregateCategoryBreakdown, computeMonthlySavingsAndProjections } from '../statsAggregation';
import { Transaction } from '../../App';

const sampleTransactions: Transaction[] = [
  { id: 1, date: '2025-01-15', montant: 1000, type: 'revenu', categorie: 'Salaire' } as any,
  { id: 2, date: '2025-01-20', montant: -200, type: 'dépense', categorie: 'Courses' } as any,
  { id: 3, date: '2025-02-05', montant: 1200, type: 'revenu', categorie: 'Salaire' } as any,
  { id: 4, date: '2025-02-12', montant: -100, type: 'dépense', categorie: 'Transports' } as any,
  { id: 5, date: '2025-03-06', montant: -250, type: 'dépense', categorie: 'Courses' } as any,
];

describe('aggregateMonthlyEvolution', () => {
  it('builds a monthly series including months without transactions', () => {
    const res = aggregateMonthlyEvolution(sampleTransactions, 'fr-FR');
    // at least Jan->Mar present and include current month (depending on now); check first months
    expect(res.find(r => r.mois === '2025-01')).toBeTruthy();
    expect(res.find(r => r.mois === '2025-02')).toBeTruthy();
    expect(res.find(r => r.mois === '2025-03')).toBeTruthy();
    const jan = res.find(r => r.mois === '2025-01')!;
    expect(jan.revenus).toBe(1000);
    expect(jan.depenses).toBe(200);
  });
});

describe('aggregateCategoryBreakdown', () => {
  it('aggregates expenses per category and sorts desc', () => {
    const res = aggregateCategoryBreakdown(sampleTransactions);
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].categorie).toBe('Courses');
    // Courses: 200 + 250 = 450
    const courses = res.find(r => r.categorie === 'Courses')!;
    expect(courses.montant).toBe(450);
  });
});

describe('computeMonthlySavingsAndProjections', () => {
  it('computes running savings (cumul) and projects next months', () => {
    const res = computeMonthlySavingsAndProjections(sampleTransactions, 2);
    // should include Jan/Feb/Mar and two projected months after current month (bounded)
    expect(res.length).toBeGreaterThanOrEqual(3);
    const jan = res.find(r => r.label === '01/2025');
    expect(jan).toBeTruthy();
    // running after Jan: revenu 1000 - dep 200 = 800
    expect(jan!.real).toBeCloseTo(800, 2);
  });

  it('ignores aggregated "Total général" rows when computing monthly savings', () => {
    const sampleWithTotal: Transaction[] = [
      { id: 1, date: '2025-01-15', montant: 1000, type: 'revenu', categorie: 'Salaire' } as any,
      { id: 2, date: '2025-01-20', montant: -200, type: 'dépense', categorie: 'Courses' } as any,
      { id: 99, date: '2025-01-25', montant: 10000, type: 'revenu', categorie: 'Total général' } as any
    ];
    const res = computeMonthlySavingsAndProjections(sampleWithTotal, 2);
    const jan = res.find(r => r.label === '01/2025');
    expect(jan).toBeTruthy();
    // the large Total général revenue should not be counted
    expect(jan!.real).toBeCloseTo(800, 2);
  });

  it('computes monthly running balance using Solde[n] = Solde[n-1] + Revenu[n] - Depense[n]', () => {
    // Example: Jan 2024 then Feb 2024 as in your specification
    const sample: Transaction[] = [
      // January 2024
      { id: 1, date: '2024-01-10', montant: 2846, type: 'revenu', categorie: 'Salaire' } as any,
      { id: 2, date: '2024-01-12', montant: -2068.28, type: 'dépense', categorie: 'Loyer' } as any,
      // February 2024
      { id: 3, date: '2024-02-05', montant: 2428, type: 'revenu', categorie: 'Salaire' } as any,
      { id: 4, date: '2024-02-20', montant: -1789.61, type: 'dépense', categorie: 'Courses' } as any,
    ];

    const res = computeMonthlySavingsAndProjections(sample, 0); // no projection needed
    const jan = res.find(r => r.label === '01/2024');
    const feb = res.find(r => r.label === '02/2024');
    expect(jan).toBeTruthy();
    expect(feb).toBeTruthy();
    // Jan: 0 + 2846 - 2068.28 = 777.72
    expect(jan!.real).toBeCloseTo(777.72, 2);
    // Feb: 777.72 + 2428 - 1789.61 = 1416.11
    expect(feb!.real).toBeCloseTo(1416.11, 2);
  });
});
