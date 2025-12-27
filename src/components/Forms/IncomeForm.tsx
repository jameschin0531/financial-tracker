import React, { useState, useEffect } from 'react';
import { useFinancialData } from '../../context/FinancialDataContext';
import type { Income, Currency } from '../../types/financial';
import { getUSDToMYRRate } from '../../services/exchangeRateService';
import styles from './Forms.module.css';

const INCOME_FREQUENCIES: Array<{ value: 'weekly' | 'bi-weekly' | 'monthly' | 'yearly' | 'one-time'; label: string }> = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'one-time', label: 'One-time' },
];

interface IncomeFormProps {
  editingIncome?: Income;
  onCancel?: () => void;
}

const IncomeForm: React.FC<IncomeFormProps> = ({ editingIncome, onCancel }) => {
  const { addIncome, updateIncome } = useFinancialData();
  const [source, setSource] = useState(editingIncome?.source || '');
  const [currency, setCurrency] = useState<Currency>(editingIncome?.currency || 'MYR');
  const [exchangeRate, setExchangeRate] = useState<number | undefined>(editingIncome?.exchangeRate);
  const [loadingRate, setLoadingRate] = useState(false);
  const [amount, setAmount] = useState(editingIncome?.amount.toString() || '');
  const [frequency, setFrequency] = useState<'weekly' | 'bi-weekly' | 'monthly' | 'yearly' | 'one-time'>(
    editingIncome?.frequency || 'monthly'
  );
  const getInitialDate = (): string => {
    if (editingIncome) {
      return editingIncome.date;
    }
    return new Date().toISOString().split('T')[0];
  };
  const [date, setDate] = useState<string>(getInitialDate());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form fields when editingIncome changes
  useEffect(() => {
    if (editingIncome) {
      setSource(editingIncome.source || '');
      setCurrency(editingIncome.currency || 'MYR');
      setExchangeRate(editingIncome.exchangeRate);
      setAmount(editingIncome.amount.toString() || '');
      setFrequency(editingIncome.frequency || 'monthly');
      setDate(editingIncome.date || new Date().toISOString().split('T')[0]);
    } else {
      // Reset form when not editing
      setSource('');
      setCurrency('MYR');
      setExchangeRate(undefined);
      setAmount('');
      setFrequency('monthly');
      setDate(new Date().toISOString().split('T')[0]);
    }
    setErrors({});
  }, [editingIncome]);

  // Fetch exchange rate when USD is selected
  useEffect(() => {
    if (currency === 'USD' && !exchangeRate) {
      setLoadingRate(true);
      getUSDToMYRRate()
        .then(rate => {
          setExchangeRate(rate);
          setLoadingRate(false);
        })
        .catch(error => {
          console.error('Failed to fetch exchange rate:', error);
          setLoadingRate(false);
        });
    } else if (currency === 'MYR') {
      setExchangeRate(undefined);
    }
  }, [currency]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!source.trim()) {
      newErrors.source = 'Income source is required';
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    
    if (!date) {
      newErrors.date = 'Date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    const incomeData: Omit<Income, 'id'> = {
      source: source.trim(),
      amount: parseFloat(amount),
      currency,
      exchangeRate: currency === 'USD' ? exchangeRate : undefined,
      frequency,
      date: date || new Date().toISOString().split('T')[0],
    };

    if (editingIncome) {
      updateIncome(editingIncome.id, incomeData);
      onCancel?.();
    } else {
      addIncome(incomeData);
      setSource('');
      setAmount('');
      setFrequency('monthly');
      setDate(new Date().toISOString().split('T')[0]);
    }
    setErrors({});
  };

  return (
    <div className={styles.formCard}>
      <h3 className={styles.formTitle}>{editingIncome ? 'Edit Income' : 'Add Income'}</h3>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="income-source" className={styles.label}>
            Income Source
            <span className={styles.tooltip} title="Enter the source of your income (e.g., Salary, Freelance, Investment)">
              ℹ️
            </span>
          </label>
          <input
            id="income-source"
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className={styles.input}
            placeholder="e.g., Salary"
          />
          {errors.source && <span className={styles.error}>{errors.source}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="income-currency" className={styles.label}>
            Currency
            <span className={styles.tooltip} title="Select the currency for this income">
              ℹ️
            </span>
          </label>
          <select
            id="income-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className={styles.select}
          >
            <option value="MYR">MYR (Malaysian Ringgit)</option>
            <option value="USD">USD (US Dollar)</option>
          </select>
          {currency === 'USD' && (
            <div className={styles.exchangeRateInfo}>
              {loadingRate ? (
                <span className={styles.loadingText}>Loading exchange rate...</span>
              ) : exchangeRate ? (
                <span className={styles.rateText}>
                  Rate: 1 USD = {exchangeRate.toFixed(4)} MYR
                </span>
              ) : (
                <span className={styles.errorText}>Failed to load exchange rate</span>
              )}
            </div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="income-amount" className={styles.label}>
            Amount ({currency === 'MYR' ? 'MYR' : 'USD'})
            <span className={styles.tooltip} title="Enter the income amount based on the frequency selected">
              ℹ️
            </span>
          </label>
          <input
            id="income-amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={styles.input}
            placeholder="0.00"
          />
          {errors.amount && <span className={styles.error}>{errors.amount}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="income-frequency" className={styles.label}>
            Frequency
            <span className={styles.tooltip} title="Select how often you receive this income">
              ℹ️
            </span>
          </label>
          <select
            id="income-frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as typeof frequency)}
            className={styles.select}
          >
            {INCOME_FREQUENCIES.map(freq => (
              <option key={freq.value} value={freq.value}>{freq.label}</option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="income-date" className={styles.label}>
            Date
            <span className={styles.tooltip} title="Select the date when this income was received or starts">
              ℹ️
            </span>
          </label>
          <input
            id="income-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={styles.input}
          />
          {errors.date && <span className={styles.error}>{errors.date}</span>}
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.submitButton}>
            {editingIncome ? 'Update Income' : 'Add Income'}
          </button>
          {editingIncome && onCancel && (
            <button type="button" onClick={onCancel} className={styles.cancelButton}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default IncomeForm;
