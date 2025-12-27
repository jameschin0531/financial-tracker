import React, { useState, useEffect } from 'react';
import { useFinancialData } from '../../context/FinancialDataContext';
import type { StockHolding, Currency, StockType } from '../../types/financial';
import { getStockPrice } from '../../services/stockPriceService';
import { getUSDToMYRRate, getHKDToMYRRate } from '../../services/exchangeRateService';
import styles from './Stocks.module.css';

interface StockHoldingFormProps {
  holding?: StockHolding;
  onCancel: () => void;
  accounts: Array<{ id: string; name: string }>;
}

const StockHoldingForm: React.FC<StockHoldingFormProps> = ({ holding, onCancel, accounts }) => {
  const { data, addStockHolding, updateStockHolding } = useFinancialData();
  const [code, setCode] = useState(holding?.code || '');
  const [name, setName] = useState(holding?.name || '');
  const [quantity, setQuantity] = useState(holding?.quantity ? holding.quantity.toString() : '');
  const [avgPrice, setAvgPrice] = useState(holding?.avgPrice ? holding.avgPrice.toString() : '');
  const [account, setAccount] = useState(holding?.account || accounts[0]?.name || '');
  const [stockType, setStockType] = useState<StockType>(holding?.stockType || 'Stock');
  const [currency, setCurrency] = useState<Currency>(holding?.currency || 'USD');
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-fetch price when code changes (only for non-cash holdings)
  useEffect(() => {
    if (code && code.length >= 1 && !holding && stockType !== 'Cash') {
      const timer = setTimeout(async () => {
        setLoadingPrice(true);
        try {
          const price = await getStockPrice(code);
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
  }, [code, holding, stockType]);

  // Auto-fill code for cash when account is selected
  useEffect(() => {
    if (stockType === 'Cash' && account && !code && !holding) {
      setCode(`${account} Cash`);
    }
  }, [stockType, account, code, holding]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // For cash, code is optional (can use account name or "Cash")
    if (stockType !== 'Cash' && !code.trim()) {
      newErrors.code = 'Stock code is required';
    }
    
    // Quantity validation only for non-cash holdings
    if (stockType !== 'Cash' && (!quantity || parseFloat(quantity) <= 0)) {
      newErrors.quantity = 'Quantity must be greater than 0';
    }
    
    // For cash, avgPrice should equal marketPrice (cash value)
    if (!avgPrice || parseFloat(avgPrice) <= 0) {
      newErrors.avgPrice = stockType === 'Cash' ? 'Cash amount is required' : 'Average price must be greater than 0';
    }
    
    if (!account) {
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
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9d4d5f3a-7801-4344-b6c6-0f62052c4b44',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StockHoldingForm.tsx:88',message:'Form submit start',data:{holdingId:holding?.id,existingMarketPrice:holding?.marketPrice,existingCurrency:holding?.currency,newCurrency:currency,stockType,avgPriceInput:avgPrice},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
    // #endregion
    
    // For cash, market price equals average price (cash doesn't fluctuate)
    if (stockType === 'Cash') {
      marketPrice = parseFloat(avgPrice);
      // Use account name or "Cash" as code if not provided
      if (!code.trim()) {
        setCode(account || 'Cash');
      }
    } else if (!marketPrice || !holding) {
      // Only fetch stock price for non-cash holdings
      setLoadingPrice(true);
      try {
        const priceUSD = await getStockPrice(code.toUpperCase());
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/9d4d5f3a-7801-4344-b6c6-0f62052c4b44',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StockHoldingForm.tsx:103',message:'Fetched stock price from API',data:{code:code.toUpperCase(),apiPriceUSD:priceUSD,holdingCurrency:currency,isUSD:currency==='USD'},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A,C'})}).catch(()=>{});
        // #endregion
        if (priceUSD) {
          // Stock prices from API are always in USD - keep marketPrice in USD regardless of holding currency
          // This ensures market prices are always accurate and comparable
          marketPrice = priceUSD;
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/9d4d5f3a-7801-4344-b6c6-0f62052c4b44',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StockHoldingForm.tsx:111',message:'Storing market price in USD',data:{priceUSD,holdingCurrency:currency,marketPriceStored:marketPrice},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'HKD-fix'})}).catch(()=>{});
          // #endregion
        }
      } catch (error) {
        console.error('Error fetching price:', error);
      }
      setLoadingPrice(false);
    } else if (holding && holding.currency !== currency) {
      // Currency changed during edit - marketPrice stays in USD (no conversion needed)
      // Only avgPrice changes with currency
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/9d4d5f3a-7801-4344-b6c6-0f62052c4b44',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StockHoldingForm.tsx:135',message:'Currency changed, marketPrice stays in USD',data:{oldCurrency:holding.currency,newCurrency:currency,marketPriceUSD:marketPrice},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'HKD-fix'})}).catch(()=>{});
      // #endregion
    }
    
    if (currency === 'USD' && !exchangeRate) {
      exchangeRate = await getUSDToMYRRate();
    } else if (currency === 'HKD' && !exchangeRate) {
      exchangeRate = await getHKDToMYRRate();
    }

    const holdingData: Omit<StockHolding, 'id'> = {
      code: stockType === 'Cash' ? (code.trim() || `${account} Cash`).toUpperCase() : code.toUpperCase().trim(),
      name: name.trim() || (stockType === 'Cash' ? `${account} Cash` : undefined),
      quantity: stockType === 'Cash' ? 1 : (quantity ? parseFloat(quantity) : 1), // Cash quantity is always 1, fallback to 1 for others
      avgPrice: parseFloat(avgPrice),
      marketPrice,
      account,
      stockType,
      currency,
      exchangeRate: (currency === 'USD' || currency === 'HKD') ? exchangeRate : undefined,
      lastUpdated: marketPrice ? new Date().toISOString() : undefined,
    };
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/9d4d5f3a-7801-4344-b6c6-0f62052c4b44',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'StockHoldingForm.tsx:129',message:'Holding data before save',data:{avgPrice:holdingData.avgPrice,marketPrice:holdingData.marketPrice,currency:holdingData.currency,exchangeRate:holdingData.exchangeRate,avgPriceCurrency:currency,marketPriceCurrency:'USD (from API)'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D'})}).catch(()=>{});
    // #endregion

    if (holding) {
      updateStockHolding(holding.id, holdingData);
      onCancel();
    } else {
      addStockHolding(holdingData);
      // Reset form and close it
      setCode('');
      setName('');
      setQuantity('');
      setAvgPrice('');
      setAccount(accounts[0]?.name || '');
      setErrors({});
      onCancel(); // Close the form after adding
    }
  };

  return (
    <div className={styles.formCard}>
      <h3 className={styles.formTitle}>{holding ? 'Edit Stock Holding' : 'Add Stock Holding'}</h3>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="stock-code" className={styles.label}>
              {stockType === 'Cash' ? 'Cash Name' : 'Stock Code (Ticker)'}
              <span className={styles.tooltip} title={stockType === 'Cash' ? 'Enter a name for this cash holding (e.g., "Tiger Cash", "Etoro Cash")' : 'Enter the stock ticker symbol (e.g., AAPL, TSLA, TSM)'}>
                ℹ️
              </span>
            </label>
            <input
              id="stock-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className={styles.input}
              placeholder={stockType === 'Cash' ? 'e.g., Tiger Cash' : 'e.g., AAPL'}
              disabled={stockType === 'Cash' && !holding} // Auto-fill for new cash entries
            />
            {errors.code && <span className={styles.error}>{errors.code}</span>}
            {stockType === 'Cash' && !code && (
              <span className={styles.hint}>Will auto-fill with account name</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="stock-name" className={styles.label}>
              Company Name (Optional)
            </label>
            <input
              id="stock-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={styles.input}
              placeholder="e.g., Apple Inc."
            />
          </div>
        </div>

        <div className={styles.formRow}>
          {stockType !== 'Cash' && (
            <div className={styles.formGroup}>
              <label htmlFor="stock-quantity" className={styles.label}>
                Quantity
              </label>
              <input
                id="stock-quantity"
                type="number"
                step="0.0001"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={styles.input}
                placeholder="0.0000"
              />
              {errors.quantity && <span className={styles.error}>{errors.quantity}</span>}
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="stock-avg-price" className={styles.label}>
              {stockType === 'Cash' ? 'Cash Amount' : 'Average Price'} ({currency})
            </label>
            <input
              id="stock-avg-price"
              type="number"
              step="0.01"
              min="0"
              value={avgPrice}
              onChange={(e) => setAvgPrice(e.target.value)}
              className={styles.input}
              placeholder="0.00"
            />
            {errors.avgPrice && <span className={styles.error}>{errors.avgPrice}</span>}
            {stockType === 'Cash' && (
              <span className={styles.hint}>Enter the total cash amount in this account</span>
            )}
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="stock-type" className={styles.label}>
              Type
            </label>
            <select
              id="stock-type"
              value={stockType}
              onChange={(e) => setStockType(e.target.value as StockType)}
              className={styles.select}
            >
              <option value="Stock">Stock</option>
              <option value="ETF">ETF</option>
              <option value="Cash">Cash</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="stock-currency" className={styles.label}>
              Currency
            </label>
            <select
              id="stock-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              className={styles.select}
            >
              <option value="USD">USD</option>
              <option value="MYR">MYR</option>
              <option value="HKD">HKD</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="stock-account" className={styles.label}>
              Account
            </label>
            {accounts.length === 0 ? (
              <div className={styles.error}>
                No trading accounts available. Please add an account first.
              </div>
            ) : (
              <>
                <select
                  id="stock-account"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
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

        {loadingPrice && stockType !== 'Cash' && (
          <div className={styles.loadingMessage}>
            Fetching current market price...
          </div>
        )}
        {stockType === 'Cash' && (
          <div className={styles.infoMessage}>
            💰 Cash holdings don't require market price updates. The amount you enter will be used as both average and market value.
          </div>
        )}

        <div className={styles.formActions}>
          <button 
            type="submit" 
            className={styles.submitButton} 
            disabled={loadingPrice && stockType !== 'Cash'}
          >
            {holding ? 'Update Holding' : 'Add Holding'}
          </button>
          <button type="button" onClick={onCancel} className={styles.cancelButton}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default StockHoldingForm;

