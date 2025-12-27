import React, { useState, useEffect } from 'react';
import { useFinancialData } from '../../context/FinancialDataContext';
import type { Asset, Currency } from '../../types/financial';
import { getUSDToMYRRate } from '../../services/exchangeRateService';
import styles from './Forms.module.css';

interface AssetFormProps {
  editingAsset?: Asset;
  onCancel?: () => void;
}

const AssetForm: React.FC<AssetFormProps> = ({ editingAsset, onCancel }) => {
  const { data, addAsset, updateAsset, addAssetCategory } = useFinancialData();
  const [name, setName] = useState(editingAsset?.name || '');
  const [category, setCategory] = useState(editingAsset?.category || data.assetCategories[0] || '');
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [assetType, setAssetType] = useState<'current' | 'fixed'>(editingAsset?.assetType || 'current');
  const [currency, setCurrency] = useState<Currency>(editingAsset?.currency || 'MYR');
  const [exchangeRate, setExchangeRate] = useState<number | undefined>(editingAsset?.exchangeRate);
  const [loadingRate, setLoadingRate] = useState(false);
  const [value, setValue] = useState(editingAsset?.value.toString() || '');
  const getInitialDate = (): string => {
    if (editingAsset) {
      return editingAsset.date;
    }
    return new Date().toISOString().split('T')[0];
  };
  const [date, setDate] = useState<string>(getInitialDate());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form fields when editingAsset changes
  useEffect(() => {
    if (editingAsset) {
      setName(editingAsset.name || '');
      setCategory(editingAsset.category || data.assetCategories[0] || '');
      setAssetType(editingAsset.assetType || 'current');
      setCurrency(editingAsset.currency || 'MYR');
      setExchangeRate(editingAsset.exchangeRate);
      setValue(editingAsset.value.toString() || '');
      setDate(editingAsset.date ?? new Date().toISOString().split('T')[0]);
      setShowNewCategory(false);
      setNewCategory('');
    } else {
      // Reset form when not editing
      setName('');
      setCategory(data.assetCategories[0] || '');
      setAssetType('current');
      setCurrency('MYR');
      setExchangeRate(undefined);
      setValue('');
      setDate(new Date().toISOString().split('T')[0]);
      setShowNewCategory(false);
      setNewCategory('');
    }
    setErrors({});
  }, [editingAsset, data.assetCategories]);

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
      newErrors.name = 'Asset name is required';
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
    
    if (!value || parseFloat(value) <= 0) {
      newErrors.value = 'Value must be greater than 0';
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
    if (showNewCategory && newCategory.trim() && !data.assetCategories.includes(newCategory.trim())) {
      addAssetCategory(newCategory.trim());
    }
    
    const finalDate = date || new Date().toISOString().split('T')[0];
    const assetData: Omit<Asset, 'id'> = {
      name: name.trim(),
      category: finalCategory,
      assetType,
      value: parseFloat(value),
      currency,
      exchangeRate: currency === 'USD' ? exchangeRate : undefined,
      date: finalDate,
    };

    if (editingAsset) {
      updateAsset(editingAsset.id, assetData);
      onCancel?.();
    } else {
      addAsset(assetData);
      setName('');
      setValue('');
      setDate(new Date().toISOString().split('T')[0]);
      // Select the newly added category or first category
      if (showNewCategory && newCategory.trim()) {
        setCategory(newCategory.trim());
      } else {
        setCategory(data.assetCategories[0] || '');
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
      <h3 className={styles.formTitle}>{editingAsset ? 'Edit Asset' : 'Add Asset'}</h3>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="asset-name" className={styles.label}>
            Asset Name
            <span className={styles.tooltip} title="Enter the name of your asset (e.g., Savings Account, Car, House)">
              ℹ️
            </span>
          </label>
          <input
            id="asset-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={styles.input}
            placeholder="e.g., Savings Account"
          />
          {errors.name && <span className={styles.error}>{errors.name}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="asset-type" className={styles.label}>
            Asset Type
            <span className={styles.tooltip} title="Current assets are liquid (cash, accounts). Fixed assets are long-term (property, vehicles)">
              ℹ️
            </span>
          </label>
          <select
            id="asset-type"
            value={assetType}
            onChange={(e) => setAssetType(e.target.value as 'current' | 'fixed')}
            className={styles.select}
          >
            <option value="current">Current Asset</option>
            <option value="fixed">Fixed Asset</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="asset-category" className={styles.label}>
            Category
            <span className={styles.tooltip} title="Select an existing category or add a new one">
              ℹ️
            </span>
          </label>
          {!showNewCategory ? (
            <select
              id="asset-category"
              value={category}
              onChange={handleCategoryChange}
              className={styles.select}
            >
              {data.assetCategories.map(cat => (
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
                  setCategory(data.assetCategories[0] || '');
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
          <label htmlFor="asset-currency" className={styles.label}>
            Currency
            <span className={styles.tooltip} title="Select the currency for this asset">
              ℹ️
            </span>
          </label>
          <select
            id="asset-currency"
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
          <label htmlFor="asset-value" className={styles.label}>
            Value ({currency === 'MYR' ? 'MYR' : 'USD'})
            <span className={styles.tooltip} title="Enter the current value of the asset">
              ℹ️
            </span>
          </label>
          <input
            id="asset-value"
            type="number"
            step="0.01"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={styles.input}
            placeholder="0.00"
          />
          {errors.value && <span className={styles.error}>{errors.value}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="asset-date" className={styles.label}>
            Date
            <span className={styles.tooltip} title="Select the date when this asset value was recorded">
              ℹ️
            </span>
          </label>
          <input
            id="asset-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={styles.input}
          />
          {errors.date && <span className={styles.error}>{errors.date}</span>}
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.submitButton}>
            {editingAsset ? 'Update Asset' : 'Add Asset'}
          </button>
          {editingAsset && onCancel && (
            <button type="button" onClick={onCancel} className={styles.cancelButton}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AssetForm;
