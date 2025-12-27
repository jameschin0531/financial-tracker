import React, { useState } from 'react';
import { useFinancialData } from '../../context/FinancialDataContext';
import type { CryptoAccount } from '../../types/financial';
import styles from '../Stocks/Stocks.module.css';

interface CryptoAccountFormProps {
  account?: CryptoAccount;
  onCancel: () => void;
}

const CryptoAccountForm: React.FC<CryptoAccountFormProps> = ({ account, onCancel }) => {
  const { addCryptoAccount, updateCryptoAccount } = useFinancialData();
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

    const accountData: Omit<CryptoAccount, 'id'> = {
      name: name.trim(),
      initialMYR: parseFloat(initialMYR),
      initialUSD: parseFloat(initialUSD),
    };

    if (account) {
      updateCryptoAccount(account.id, accountData);
      onCancel();
    } else {
      addCryptoAccount(accountData);
      setName('');
      setInitialMYR('');
      setInitialUSD('');
    }
    setErrors({});
  };

  return (
    <div className={styles.formCard}>
      <h3 className={styles.formTitle}>{account ? 'Edit Crypto Account' : 'Add Crypto Account'}</h3>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="crypto-account-name" className={styles.label}>
            Account/Wallet Name
            <span className={styles.tooltip} title="Enter the account or wallet name (e.g., Binance, Coinbase, MetaMask)">
              ℹ️
            </span>
          </label>
          <input
            id="crypto-account-name"
            type="text"
            value={name}
            onChange={(e) => {
              const target = e.target as HTMLInputElement;
              setName(target.value);
            }}
            className={styles.input}
            placeholder="e.g., Binance"
          />
          {errors.name && <span className={styles.error}>{errors.name}</span>}
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="crypto-account-initial-myr" className={styles.label}>
              Initial Investment (MYR)
            </label>
            <input
              id="crypto-account-initial-myr"
              type="number"
              step="0.01"
              min="0"
              value={initialMYR}
              onChange={(e) => {
                const target = e.target as HTMLInputElement;
                setInitialMYR(target.value);
              }}
              className={styles.input}
              placeholder="0.00"
            />
            {errors.initialMYR && <span className={styles.error}>{errors.initialMYR}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="crypto-account-initial-usd" className={styles.label}>
              Initial Investment (USD)
            </label>
            <input
              id="crypto-account-initial-usd"
              type="number"
              step="0.01"
              min="0"
              value={initialUSD}
              onChange={(e) => {
                const target = e.target as HTMLInputElement;
                setInitialUSD(target.value);
              }}
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

export default CryptoAccountForm;

