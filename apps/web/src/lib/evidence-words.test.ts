import { describe, expect, it } from 'vitest';

import { independentReports, reportTotals } from './i18n';

describe('independentReports', () => {
  it('says what a camp count counts, in both languages', () => {
    expect(independentReports(1, 'en')).toBe('1 independent report');
    expect(independentReports(2, 'en')).toBe('2 independent reports');
    expect(independentReports(0, 'en')).toBe('0 independent reports');
    expect(independentReports(1, 'tr')).toBe('1 bağımsız haber');
  });
});

describe('reportTotals', () => {
  it('splits the listed outlets into independent reports and copies', () => {
    expect(reportTotals(9, 1, 'en')).toBe('9 independent, 1 copy');
    expect(reportTotals(4, 2, 'en')).toBe('4 independent, 2 copies');
    expect(reportTotals(9, 1, 'tr')).toBe('9 bağımsız, 1 kopya');
  });

  it('leaves copies out when there are none', () => {
    expect(reportTotals(3, 0, 'en')).toBe('3 independent');
    expect(reportTotals(3, 0, 'tr')).toBe('3 bağımsız');
  });
});
