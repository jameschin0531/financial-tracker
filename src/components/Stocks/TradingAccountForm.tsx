import React, { useState } from 'react';
import { useFinancialData } from '../../context/FinancialDataContext';
import { TradingAccount } from '../../types/financial';
import { getUSDToMYRRate } from '../../services/exchangeRateService';
import styles from './Stocks.module.css';

interface TradingAccountFormProps {
  account?: TradingAccount;
  onCancel: () => void;
}

const TradingAccountForm: React.FC<TradingAccountFormProps> = ({ account, onCancel }) => {
  const { addTradingAccount, updateTradingAccount } = useFinancialData();
  const [name, setName] = useState(account?.name || '');
  const [initialMYR, setInitialMYR] = useState(account?.initialMYR.toString() || '');
  const [initialUSD, setInitialUSD] = useState(account?.initialUSD.toString() || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = 'Account name is required';
    }
    
    if (!initialMYR || parseFloat(initialMYR) < 0) {
      newErrors.initialMYR = 'Initial MYR must be 0 or greater';
    }
    
    if (!initialUSD || parseFloat(initialUSD) < 0) {
      newErrors.initialUSD = 'Initial USD must be 0 or greater';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    const accountData: Omit<TradingAccount, 'id'> = {
      name: name.trim(),
      initialMYR: parseFloat(initialMYR),
      initialUSD: parseFloat(initialUSD),
    };

    if (account) {
      updateTradingAccount(account.id, accountData);
      onCancel();
    } else {
      addTradingAccount(accountData);
      setName('');
      setInitialMYR('');
      setInitialUSD('');
    }
    setErrors({});
  };

  return (
    <div className={styles.formCard}>
      <h3 className={styles.formTitle}>{account ? 'Edit Trading Account' : 'Add Trading Account'}</h3>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="account-name" className={styles.label}>
            Account Name
            <span className={styles.tooltip} title="Enter the account name (e.g., etoro, tiger, futu, webull)">
              ℹ️
            </span>
          </label>
          <input
            id="account-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={styles.input}
            placeholder="e.g., etoro"
          />
          {errors.name && <span className={styles.error}>{errors.name}</span>}
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="account-initial-myr" className={styles.label}>
              Initial Investment (MYR)
            </label>
            <input
              id="account-initial-myr"
              type="number"
              step="0.01"
              min="0"
              value={initialMYR}
              onChange={(e) => setInitialMYR(e.target.value)}
              className={styles.input}
              placeholder="0.00"
            />
            {errors.initialMYR && <span className={styles.error}>{errors.initialMYR}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="account-initial-usd" className={styles.label}>
              Initial Investment (USD)
            </label>
            <input
              id="account-initial-usd"
              type="number"
              step="0.01"
              min="0"
              value={initialUSD}
              onChange={(e) => setInitialUSD(e.target.value)}
              className={styles.input}
              placeholder="0.00"
            />
            {errors.initialUSD && <span className={styles.error}>{errors.initialUSD}</span>}
          </div>
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.submitButton}>
            {account ? 'Update Account' : 'Add Account'}
          </button>
          <button type="button" onClick={onCancel} className={styles.cancelButton}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default TradingAccountForm;

