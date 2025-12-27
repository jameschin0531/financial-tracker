import React, { useState, useEffect } from 'react';
import { useFinancialData } from '../../context/FinancialDataContext';
import type { Liability, Currency } from '../../types/financial';
import { getUSDToMYRRate } from '../../services/exchangeRateService';
import styles from './Forms.module.css';

interface LiabilityFormProps {
  editingLiability?: Liability;
  onCancel?: () => void;
}

const LiabilityForm: React.FC<LiabilityFormProps> = ({ editingLiability, onCancel }) => {
  const { data, addLiability, updateLiability, addLiabilityCategory } = useFinancialData();
  const [name, setName] = useState(editingLiability?.name || '');
  const [category, setCategory] = useState(editingLiability?.category || data.liabilityCategories[0] || '');
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [currency, setCurrency] = useState<Currency>(editingLiability?.currency || 'MYR');
  const [exchangeRate, setExchangeRate] = useState<number | undefined>(editingLiability?.exchangeRate);
  const [loadingRate, setLoadingRate] = useState(false);
  const [amount, setAmount] = useState(editingLiability?.amount.toString() || '');
  const [interestRate, setInterestRate] = useState(editingLiability?.interestRate?.toString() || '');
  const getInitialDate = (): string => {
    if (editingLiability) {
      return editingLiability.date;
    }
    return new Date().toISOString().split('T')[0];
  };
  const [date, setDate] = useState<string>(getInitialDate());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form fields when editingLiability changes
  useEffect(() => {
    if (editingLiability) {
      setName(editingLiability.name || '');
      setCategory(editingLiability.category || data.liabilityCategories[0] || '');
      setCurrency(editingLiability.currency || 'MYR');
      setExchangeRate(editingLiability.exchangeRate);
      setAmount(editingLiability.amount.toString() || '');
      setInterestRate(editingLiability.interestRate?.toString() || '');
      setDate(editingLiability.date);
      setShowNewCategory(false);
      setNewCategory('');
    } else {
      // Reset form when not editing
      setName('');
      setCategory(data.liabilityCategories[0] || '');
      setCurrency('MYR');
      setExchangeRate(undefined);
      setAmount('');
      setInterestRate('');
      setDate(new Date().toISOString().split('T')[0]);
      setShowNewCategory(false);
      setNewCategory('');
    }
    setErrors({});
  }, [editingLiability, data.liabilityCategories]);

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
    
    if (!name.trim()) {
      newErrors.name = 'Liability name is required';
    }
    
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
    
    if (interestRate && (parseFloat(interestRate) < 0 || parseFloat(interestRate) > 100)) {
      newErrors.interestRate = 'Interest rate must be between 0 and 100';
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

    const finalCategory = showNewCategory && newCategory.trim() ? newCategory.trim() : category;
    
    // Add new category if it's a new one (must be done before using it)
    if (showNewCategory && newCategory.trim() && !data.liabilityCategories.includes(newCategory.trim())) {
      addLiabilityCategory(newCategory.trim());
    }
    
    const finalDate: string = date || new Date().toISOString().split('T')[0];
    const liabilityData: Omit<Liability, 'id'> = {
      name: name.trim(),
      category: finalCategory,
      amount: parseFloat(amount),
      currency,
      exchangeRate: currency === 'USD' ? exchangeRate : undefined,
      interestRate: interestRate ? parseFloat(interestRate) : undefined,
      date: finalDate,
    };

    if (editingLiability) {
      updateLiability(editingLiability.id, liabilityData);
      onCancel?.();
    } else {
      addLiability(liabilityData);
      setName('');
      setAmount('');
      setInterestRate('');
      setDate(new Date().toISOString().split('T')[0]);
      // Select the newly added category or first category
      if (showNewCategory && newCategory.trim()) {
        setCategory(newCategory.trim());
      } else {
        setCategory(data.liabilityCategories[0] || '');
      }
      setShowNewCategory(false);
      setNewCategory('');
    }
    setErrors({});
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    if (selectedValue === '__new__') {
      setShowNewCategory(true);
      setCategory('');
      setNewCategory('');
      // Clear category error when switching to new category mode
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.category;
        return newErrors;
      });
    } else {
      setShowNewCategory(false);
      setCategory(selectedValue);
      setNewCategory('');
      // Clear category error when selecting existing category
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.category;
        return newErrors;
      });
    }
  };

  return (
    <div className={styles.formCard}>
      <h3 className={styles.formTitle}>{editingLiability ? 'Edit Liability' : 'Add Liability'}</h3>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="liability-name" className={styles.label}>
            Liability Name
            <span className={styles.tooltip} title="Enter the name of your liability (e.g., Credit Card, Mortgage)">
              ℹ️
            </span>
          </label>
          <input
            id="liability-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={styles.input}
            placeholder="e.g., Credit Card"
          />
          {errors.name && <span className={styles.error}>{errors.name}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="liability-category" className={styles.label}>
            Category
            <span className={styles.tooltip} title="Select an existing category or add a new one">
              ℹ️
            </span>
          </label>
          {!showNewCategory ? (
            <select
              id="liability-category"
              value={category}
              onChange={handleCategoryChange}
              className={styles.select}
            >
              {data.liabilityCategories.map(cat => (
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
                className={`${styles.input} ${errors.category ? styles.inputError : ''}`}
                placeholder="Enter new category name"
                autoFocus
              />
              <button
                type="button"
                onClick={() => {
                  setShowNewCategory(false);
                  setNewCategory('');
                  setCategory(data.liabilityCategories[0] || '');
                  setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.category;
                    return newErrors;
                  });
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
          <label htmlFor="liability-currency" className={styles.label}>
            Currency
            <span className={styles.tooltip} title="Select the currency for this liability">
              ℹ️
            </span>
          </label>
          <select
            id="liability-currency"
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
          <label htmlFor="liability-amount" className={styles.label}>
            Amount Owed ({currency === 'MYR' ? 'MYR' : 'USD'})
            <span className={styles.tooltip} title="Enter the total amount you owe for this liability">
              ℹ️
            </span>
          </label>
          <input
            id="liability-amount"
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
          <label htmlFor="liability-interest" className={styles.label}>
            Interest Rate (%)
            <span className={styles.tooltip} title="Enter the annual interest rate (optional)">
              ℹ️
            </span>
          </label>
          <input
            id="liability-interest"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={interestRate}
            onChange={(e) => setInterestRate(e.target.value)}
            className={styles.input}
            placeholder="Optional"
          />
          {errors.interestRate && <span className={styles.error}>{errors.interestRate}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="liability-date" className={styles.label}>
            Date
            <span className={styles.tooltip} title="Select the date when this liability was recorded">
              ℹ️
            </span>
          </label>
          <input
            id="liability-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={styles.input}
          />
          {errors.date && <span className={styles.error}>{errors.date}</span>}
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.submitButton}>
            {editingLiability ? 'Update Liability' : 'Add Liability'}
          </button>
          {editingLiability && onCancel && (
            <button type="button" onClick={onCancel} className={styles.cancelButton}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default LiabilityForm;
