import React, { useState, useEffect } from 'react';
import { useFinancialData } from '../../context/FinancialDataContext';
import type { Expense, Currency } from '../../types/financial';
import { getUSDToMYRRate } from '../../services/exchangeRateService';
import styles from './Forms.module.css';

interface ExpenseFormProps {
  editingExpense?: Expense;
  onCancel?: () => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ editingExpense, onCancel }) => {
  const { data, addExpense, updateExpense, addExpenseCategory } = useFinancialData();
  const [category, setCategory] = useState(editingExpense?.category || data.expenseCategories[0] || '');
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [currency, setCurrency] = useState<Currency>(editingExpense?.currency || 'MYR');
  const [exchangeRate, setExchangeRate] = useState<number | undefined>(editingExpense?.exchangeRate);
  const [loadingRate, setLoadingRate] = useState(false);
  const [amount, setAmount] = useState(editingExpense?.amount.toString() || '');
  const getInitialDate = (): string => {
    if (editingExpense) {
      return editingExpense.date;
    }
    return new Date().toISOString().split('T')[0];
  };
  const [date, setDate] = useState<string>(getInitialDate());
  const [description, setDescription] = useState(editingExpense?.description || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form fields when editingExpense changes
  useEffect(() => {
    if (editingExpense) {
      setCategory(editingExpense.category || data.expenseCategories[0] || '');
      setCurrency(editingExpense.currency || 'MYR');
      setExchangeRate(editingExpense.exchangeRate);
      setAmount(editingExpense.amount.toString() || '');
      setDate(editingExpense.date || new Date().toISOString().split('T')[0]);
      setDescription(editingExpense.description || '');
      setShowNewCategory(false);
      setNewCategory('');
    } else {
      // Reset form when not editing
      setCategory(data.expenseCategories[0] || '');
      setCurrency('MYR');
      setExchangeRate(undefined);
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setShowNewCategory(false);
      setNewCategory('');
    }
    setErrors({});
  }, [editingExpense, data.expenseCategories]);

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
    
    // Validate category based on whether we're adding a new one
    if (showNewCategory) {
      if (!newCategory || !newCategory.trim()) {
        newErrors.category = 'New category name is required';
      }
    } else {
      if (!category || category === '__new__' || !category.trim()) {
        newErrors.category = 'Category is required';
      }
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
    
    // Handle new category
    let finalCategory = category;
    if (showNewCategory && newCategory.trim()) {
      addExpenseCategory(newCategory.trim());
      finalCategory = newCategory.trim();
    }
    
    const expenseData: Omit<Expense, 'id'> = {
      category: finalCategory || data.expenseCategories[0] || '',
      amount: parseFloat(amount),
      currency,
      exchangeRate: currency === 'USD' ? exchangeRate : undefined,
      date: date || new Date().toISOString().split('T')[0],
      description: description.trim() || undefined,
    };

    if (editingExpense) {
      updateExpense(editingExpense.id, expenseData);
      onCancel?.();
    } else {
      addExpense(expenseData);
      setAmount('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
    }
    setErrors({});
  };

  return (
    <div className={styles.formCard}>
      <h3 className={styles.formTitle}>{editingExpense ? 'Edit Expense' : 'Add Expense'}</h3>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="expense-category" className={styles.label}>
            Category
            <span className={styles.tooltip} title="Select the category that best describes your expense">
              ℹ️
            </span>
          </label>
          {!showNewCategory ? (
            <select
              id="expense-category"
              value={category}
              onChange={(e) => {
                if (e.target.value === '__new__') {
                  setShowNewCategory(true);
                  setCategory('');
                } else {
                  setCategory(e.target.value);
                }
              }}
              className={styles.select}
            >
              {data.expenseCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              <option value="__new__">+ Add New Category</option>
            </select>
          ) : (
            <div className={styles.newCategoryGroup}>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => {
                  setNewCategory(e.target.value);
                  // Clear error when user starts typing
                  if (errors.category) {
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.category;
                      return newErrors;
                    });
                  }
                }}
                placeholder="Enter new category name"
                className={styles.input}
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setShowNewCategory(false);
                  setNewCategory('');
                  setCategory(data.expenseCategories[0] || '');
                }}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          )}
          {errors.category && <span className={styles.error}>{errors.category}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="expense-currency" className={styles.label}>
            Currency
            <span className={styles.tooltip} title="Select the currency for this expense">
              ℹ️
            </span>
          </label>
          <select
            id="expense-currency"
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
          <label htmlFor="expense-amount" className={styles.label}>
            Amount ({currency === 'MYR' ? 'MYR' : 'USD'})
            <span className={styles.tooltip} title="Enter the amount spent">
              ℹ️
            </span>
          </label>
          <input
            id="expense-amount"
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
          <label htmlFor="expense-date" className={styles.label}>
            Date
            <span className={styles.tooltip} title="Select the date when this expense occurred">
              ℹ️
            </span>
          </label>
          <input
            id="expense-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={styles.input}
          />
          {errors.date && <span className={styles.error}>{errors.date}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="expense-description" className={styles.label}>
            Description
            <span className={styles.tooltip} title="Optional: Add a description or note about this expense">
              ℹ️
            </span>
          </label>
          <input
            id="expense-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={styles.input}
            placeholder="Optional"
          />
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.submitButton}>
            {editingExpense ? 'Update Expense' : 'Add Expense'}
          </button>
          {editingExpense && onCancel && (
            <button type="button" onClick={onCancel} className={styles.cancelButton}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default ExpenseForm;
