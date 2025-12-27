import React, { useState } from 'react';
import { useFinancialData } from '../../context/FinancialDataContext';
import { Deposit } from '../../types/financial';
import styles from './Stocks.module.css';

interface DepositFormProps {
  deposit?: Deposit;
  onCancel: () => void;
  accounts: string[];
}

const DepositForm: React.FC<DepositFormProps> = ({ deposit, onCancel, accounts }) => {
  const { addDeposit, updateDeposit } = useFinancialData();
  const [account, setAccount] = useState(deposit?.account || accounts[0] || '');
  const [date, setDate] = useState(deposit?.date || new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState(deposit?.amount.toString() || '');
  const [usd, setUSD] = useState(deposit?.usd?.toString() || '');
  const [sgd, setSGD] = useState(deposit?.sgd?.toString() || '');
  const [aud, setAUD] = useState(deposit?.aud?.toString() || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!account) {
      newErrors.account = 'Account is required';
    }
    
    if (!date) {
      newErrors.date = 'Date is required';
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    const depositData: Omit<Deposit, 'id'> = {
      account,
      date,
      amount: parseFloat(amount),
      usd: usd ? parseFloat(usd) : undefined,
      sgd: sgd ? parseFloat(sgd) : undefined,
      aud: aud ? parseFloat(aud) : undefined,
    };

    if (deposit) {
      updateDeposit(deposit.id, depositData);
      onCancel();
    } else {
      addDeposit(depositData);
      setAccount(accounts[0] || '');
      setDate(new Date().toISOString().split('T')[0]);
      setAmount('');
      setUSD('');
      setSGD('');
      setAUD('');
    }
    setErrors({});
  };

  return (
    <div className={styles.formCard}>
      <h3 className={styles.formTitle}>{deposit ? 'Edit Deposit' : 'Add Deposit'}</h3>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="deposit-account" className={styles.label}>
              Account
            </label>
            <select
              id="deposit-account"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              className={styles.select}
            >
              {accounts.map(acc => (
                <option key={acc} value={acc}>{acc}</option>
              ))}
            </select>
            {errors.account && <span className={styles.error}>{errors.account}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="deposit-date" className={styles.label}>
              Date
            </label>
            <input
              id="deposit-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={styles.input}
            />
            {errors.date && <span className={styles.error}>{errors.date}</span>}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="deposit-amount" className={styles.label}>
            Amount (MYR)
            <span className={styles.tooltip} title="Enter the deposit amount in Malaysian Ringgit">
              ℹ️
            </span>
          </label>
          <input
            id="deposit-amount"
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

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="deposit-usd" className={styles.label}>
              USD (Optional)
            </label>
            <input
              id="deposit-usd"
              type="number"
              step="0.01"
              min="0"
              value={usd}
              onChange={(e) => setUSD(e.target.value)}
              className={styles.input}
              placeholder="0.00"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="deposit-sgd" className={styles.label}>
              SGD (Optional)
            </label>
            <input
              id="deposit-sgd"
              type="number"
              step="0.01"
              min="0"
              value={sgd}
              onChange={(e) => setSGD(e.target.value)}
              className={styles.input}
              placeholder="0.00"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="deposit-aud" className={styles.label}>
              AUD (Optional)
            </label>
            <input
              id="deposit-aud"
              type="number"
              step="0.01"
              min="0"
              value={aud}
              onChange={(e) => setAUD(e.target.value)}
              className={styles.input}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.submitButton}>
            {deposit ? 'Update Deposit' : 'Add Deposit'}
          </button>
          <button type="button" onClick={onCancel} className={styles.cancelButton}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default DepositForm;

