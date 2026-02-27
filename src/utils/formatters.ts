const AMOUNT_VISIBILITY_STORAGE_KEY = 'financialAppHideAmounts';
const MASKED_AMOUNT = '****';

const shouldHideAmounts = (): boolean => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return true;
  }

  const stored = window.localStorage.getItem(AMOUNT_VISIBILITY_STORAGE_KEY);
  if (stored === 'false') {
    return false;
  }
  if (stored === 'true') {
    return true;
  }

  return true;
};

export const formatCurrency = (amount: number, currency: 'MYR' | 'USD' | 'HKD' = 'MYR'): string => {
  if (shouldHideAmounts()) {
    return MASKED_AMOUNT;
  }

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
  if (shouldHideAmounts()) {
    return MASKED_AMOUNT;
  }

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

