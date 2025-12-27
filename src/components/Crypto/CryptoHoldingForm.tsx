import React, { useState, useEffect } from 'react';
import { useFinancialData } from '../../context/FinancialDataContext';
import type { CryptoHolding } from '../../types/financial';
import { getCryptoPrice } from '../../services/cryptoPriceService';
import { getUSDToMYRRate } from '../../services/exchangeRateService';
import styles from '../Stocks/Stocks.module.css';

interface CryptoHoldingFormProps {
  holding?: CryptoHolding;
  onCancel: () => void;
  accounts: Array<{ id: string; name: string }>;
}

const CryptoHoldingForm: React.FC<CryptoHoldingFormProps> = ({ holding, onCancel, accounts }) => {
  const { data, addCryptoHolding, updateCryptoHolding } = useFinancialData();
  const [symbol, setSymbol] = useState(holding?.symbol || '');
  const [name, setName] = useState(holding?.name || '');
  const [quantity, setQuantity] = useState(holding?.quantity ? holding.quantity.toString() : '');
  const [avgPrice, setAvgPrice] = useState(holding?.avgPrice ? holding.avgPrice.toString() : '');
  const [account, setAccount] = useState(holding?.account || (accounts.length > 0 && accounts[0] ? accounts[0].name : ''));
  
  // Update account when accounts change
  useEffect(() => {
    if (!holding && accounts.length > 0 && accounts[0] && !account) {
      setAccount(accounts[0].name);
    }
  }, [accounts, holding, account]);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Clear errors when user types
  useEffect(() => {
    if (errors.avgPrice && avgPrice) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.avgPrice;
        return newErrors;
      });
    }
  }, [avgPrice, errors.avgPrice]);

  // Auto-fetch price when symbol changes
  useEffect(() => {
    if (symbol && symbol.length >= 2 && !holding) {
      const timer = setTimeout(async () => {
        setLoadingPrice(true);
        try {
          const price = await getCryptoPrice(symbol);
          if (price) {
            // Price will be set when form is submitted
          }
        } catch (error) {
          console.error('Error fetching price:', error);
        } finally {
          setLoadingPrice(false);
        }
      }, 1000); // Debounce
      
      return () => clearTimeout(timer);
    }
  }, [symbol, holding]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!symbol.trim()) {
      newErrors.symbol = 'Crypto symbol is required';
    }
    
    const quantityNum = parseFloat(quantity);
    if (!quantity || isNaN(quantityNum) || quantityNum <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }
    
    const avgPriceNum = parseFloat(avgPrice);
    if (!avgPrice || avgPrice.trim() === '' || isNaN(avgPriceNum) || avgPriceNum <= 0) {
      newErrors.avgPrice = 'Average price must be greater than 0';
    }
    
    if (!account || account.trim() === '') {
      newErrors.account = 'Account is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    // Fetch current price and exchange rate
    let marketPrice = holding?.marketPrice;
    let exchangeRate = holding?.exchangeRate;
    
    
    if (!marketPrice || !holding) {
      setLoadingPrice(true);
      try {
        const price = await getCryptoPrice(symbol.toUpperCase());
        if (price) {
          marketPrice = price;
        }
      } catch (error) {
        console.error('Error fetching price:', error);
      }
      setLoadingPrice(false);
    }
    
    // Crypto prices are always in USD, so always fetch USD to MYR rate
    if (!exchangeRate) {
      exchangeRate = await getUSDToMYRRate();
    }

    const holdingData: Omit<CryptoHolding, 'id'> = {
      symbol: symbol.toUpperCase().trim(),
      name: name.trim() || undefined,
      quantity: parseFloat(quantity),
      avgPrice: parseFloat(avgPrice),
      marketPrice,
      account,
      currency: 'USD', // Crypto prices are always in USD
      exchangeRate: exchangeRate || 4.7,
      lastUpdated: marketPrice ? new Date().toISOString() : undefined,
    };
    

    if (holding) {
      updateCryptoHolding(holding.id, holdingData);
      onCancel();
    } else {
      addCryptoHolding(holdingData);
      setSymbol('');
      setName('');
      setQuantity('');
      setAvgPrice('');
      setAccount(accounts[0]?.name || '');
      setErrors({});
      onCancel();
    }
  };

  return (
    <div className={styles.formCard}>
      <h3 className={styles.formTitle}>{holding ? 'Edit Crypto Holding' : 'Add Crypto Holding'}</h3>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="crypto-symbol" className={styles.label}>
              Crypto Symbol
              <span className={styles.tooltip} title="Enter the crypto symbol (e.g., BTC, ETH, SOL)">
                ℹ️
              </span>
            </label>
            <input
              id="crypto-symbol"
              type="text"
              value={symbol}
              onChange={(e) => {
                const target = e.target as HTMLInputElement;
                setSymbol(target.value.toUpperCase());
              }}
              className={styles.input}
              placeholder="e.g., BTC"
            />
            {errors.symbol && <span className={styles.error}>{errors.symbol}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="crypto-name" className={styles.label}>
              Crypto Name (Optional)
            </label>
            <input
              id="crypto-name"
              type="text"
              value={name}
              onChange={(e) => {
                const target = e.target as HTMLInputElement;
                setName(target.value);
              }}
              className={styles.input}
              placeholder="e.g., Bitcoin"
            />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="crypto-quantity" className={styles.label}>
              Quantity
            </label>
            <input
              id="crypto-quantity"
              type="number"
              step="0.00000001"
              min="0"
              value={quantity}
              onChange={(e) => {
                const target = e.target as HTMLInputElement;
                setQuantity(target.value);
              }}
              className={styles.input}
              placeholder="0.00000000"
            />
            {errors.quantity && <span className={styles.error}>{errors.quantity}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="crypto-avg-price" className={styles.label}>
              Average Price (USD)
            </label>
            <input
              id="crypto-avg-price"
              type="number"
              step="0.01"
              min="0"
              value={avgPrice}
              onChange={(e) => {
                const target = e.target as HTMLInputElement;
                setAvgPrice(target.value);
              }}
              className={styles.input}
              placeholder="0.00"
            />
            {errors.avgPrice && <span className={styles.error}>{errors.avgPrice}</span>}
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="crypto-account" className={styles.label}>
              Account/Wallet
            </label>
            {accounts.length === 0 ? (
              <div className={styles.error}>
                No crypto accounts available. Please add an account first.
              </div>
            ) : (
              <>
                <select
                  id="crypto-account"
                  value={account}
                  onChange={(e) => {
                    const target = e.target as HTMLSelectElement;
                    setAccount(target.value);
                  }}
                  className={styles.select}
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.name}>{acc.name}</option>
                  ))}
                </select>
                {errors.account && <span className={styles.error}>{errors.account}</span>}
              </>
            )}
          </div>
        </div>

        {loadingPrice && (
          <div className={styles.loadingMessage}>
            Fetching current market price...
          </div>
        )}

        <div className={styles.formActions}>
          <button 
            type="submit" 
            className={styles.submitButton} 
            disabled={loadingPrice}
          >
            {holding ? 'Update Holding' : 'Add Holding'}
          </button>
          <button type="button" onClick={onCancel} className={styles.cancelButton}>
            Cancel
          </button>
        </div>
        {accounts.length === 0 && (
          <div className={styles.error} style={{ marginTop: '0.5rem', textAlign: 'center', width: '100%' }}>
            Please add a crypto account first before adding holdings.
          </div>
        )}
      </form>
    </div>
  );
};

export default CryptoHoldingForm;

