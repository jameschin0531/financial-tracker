export const formatCurrency = (amount: number, currency: 'MYR' | 'USD' | 'HKD' = 'MYR'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatCurrencyWithRate = (
  amount: number,
  currency: 'MYR' | 'USD' | 'HKD',
  exchangeRate?: number
): string => {
  const formatted = formatCurrency(amount, currency);
  if ((currency === 'USD' || currency === 'HKD') && exchangeRate) {
    const myrAmount = amount * exchangeRate;
    return `${formatted} (${formatCurrency(myrAmount, 'MYR')} @ ${exchangeRate.toFixed(4)})`;
  }
  return formatted;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

export const formatMonth = (monthString: string): string => {
  const [year, month] = monthString.split('-');
  if (!year || !month) {
    return monthString;
  }
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
  }).format(date);
};

