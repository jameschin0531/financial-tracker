import React, { useState, useEffect } from 'react';
import { useFinancialData } from '../context/FinancialDataContext';
import type { CryptoHolding, CryptoAccount } from '../types/financial';
import { getCryptoPrice, getCryptoPrices } from '../services/cryptoPriceService';
import {
  calculateTotalCryptoPortfolioValue,
  calculateCryptoHoldingPandL,
  calculateCryptoHoldingMarketValue,
  calculateCryptoAccountSummary,
} from '../services/cryptoCalculations';
import { formatCurrency } from '../utils/formatters';
import CryptoHoldingForm from '../components/Crypto/CryptoHoldingForm';
import CryptoAccountForm from '../components/Crypto/CryptoAccountForm';
import styles from './StockTracker.module.css';

const CryptoTrackerPage: React.FC = () => {
  const { 
    data, 
    updateCryptoPrice, 
    updateCryptoHolding,
    deleteCryptoHolding,
    deleteCryptoAccount,
  } = useFinancialData();
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [editingHolding, setEditingHolding] = useState<CryptoHolding | 'new' | null>(null);
  const [editingAccount, setEditingAccount] = useState<CryptoAccount | 'new' | null>(null);
  const [portfolioValue, setPortfolioValue] = useState<{ usd: number; myr: number }>({ usd: 0, myr: 0 });
  const [accountSummary, setAccountSummary] = useState<Array<CryptoAccount & { pnlMYR: number; pnlPercentage: number }>>([]);

  // Calculate portfolio values
  useEffect(() => {
    const calculateValues = async () => {
      const total = await calculateTotalCryptoPortfolioValue(data.cryptoHoldings);
      const summary = await calculateCryptoAccountSummary(data.cryptoAccounts, data.cryptoHoldings);
      setPortfolioValue(total);
      setAccountSummary(summary);
    };
    
    calculateValues();
  }, [data.cryptoHoldings, data.cryptoAccounts]);

  const handleUpdatePrices = async () => {
    setLoadingPrices(true);
    try {
      const symbols = [...new Set(data.cryptoHoldings.map(h => h.symbol))];
      const prices = await getCryptoPrices(symbols);
      
      // Update prices for all holdings
      for (const holding of data.cryptoHoldings) {
        const price = prices.get(holding.symbol.toUpperCase());
        if (price !== undefined) {
          updateCryptoPrice(holding.id, price);
        }
      }
    } catch (error) {
      console.error('Error updating prices:', error);
      alert('Failed to update crypto prices. Please try again.');
    } finally {
      setLoadingPrices(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.headerTop}>
          <h1 className={styles.pageTitle}>Crypto Tracker</h1>
          <button
            className={styles.updateButton}
            onClick={handleUpdatePrices}
            disabled={loadingPrices || data.cryptoHoldings.length === 0}
          >
            {loadingPrices ? 'Updating...' : '🔄 Update Prices'}
          </button>
        </div>
        <div className={styles.portfolioSummary}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Total Portfolio Value</span>
            <span className={styles.summaryValue}>{formatCurrency(portfolioValue.myr, 'MYR')}</span>
            <span className={styles.summarySubtext}>{formatCurrency(portfolioValue.usd, 'USD')}</span>
          </div>
        </div>
      </div>

      <div className={styles.pageContent}>
        {/* Crypto Holdings Table */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Crypto Holdings</h2>
            <button
              className={styles.addButton}
              onClick={() => setEditingHolding('new')}
            >
              + Add Holding
            </button>
          </div>
          
          {editingHolding === null && data.cryptoHoldings.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No crypto holdings yet. Add your first holding to get started.</p>
            </div>
          ) : editingHolding === null ? (
            <div className={styles.tableContainer}>
              <table className={styles.holdingsTable}>
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Quantity</th>
                    <th>Market Price</th>
                    <th>AVG Price</th>
                    <th>MV USD</th>
                    <th>MV MYR</th>
                    <th>P&L</th>
                    <th>Account</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cryptoHoldings.map((holding) => {
                    // Crypto prices are always in USD, so calculation is straightforward
                    const usdRate = holding.exchangeRate || 4.7; // Use stored rate or fallback
                    const { usd: usdValue, myr: myrValue } = calculateCryptoHoldingMarketValue(holding, usdRate);
                    const pnl = calculateCryptoHoldingPandL(holding, usdRate);
                    
                    return (
                      <tr key={holding.id}>
                        <td className={styles.codeCell}>
                          <strong>{holding.symbol}</strong>
                          {holding.name && <div className={styles.nameSubtext}>{holding.name}</div>}
                        </td>
                        <td>{holding.quantity.toFixed(8)}</td>
                        <td>
                          {holding.marketPrice 
                            ? formatCurrency(holding.marketPrice, 'USD')
                            : <span className={styles.noPrice}>No price</span>}
                        </td>
                        <td>{formatCurrency(holding.avgPrice, 'USD')}</td>
                        <td>{formatCurrency(usdValue, 'USD')}</td>
                        <td>{formatCurrency(myrValue, 'MYR')}</td>
                        <td className={pnl.myr >= 0 ? styles.positive : styles.negative}>
                          {formatCurrency(pnl.myr, 'MYR')} ({pnl.percentage.toFixed(1)}%)
                        </td>
                        <td>{holding.account}</td>
                        <td>
                          <div className={styles.actionButtons}>
                            <button
                              className={styles.editButton}
                              onClick={() => setEditingHolding(holding)}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              className={styles.deleteButton}
                              onClick={() => {
                                if (confirm('Delete this holding?')) {
                                  deleteCryptoHolding(holding.id);
                                }
                              }}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <CryptoHoldingForm
              holding={editingHolding === 'new' ? undefined : editingHolding}
              onCancel={() => setEditingHolding(null)}
              accounts={data.cryptoAccounts}
            />
          )}
        </section>

        {/* Account Summary */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Account Summary</h2>
            <button
              className={styles.addButton}
              onClick={() => setEditingAccount('new')}
            >
              + Add Account
            </button>
          </div>
          
          {editingAccount === null ? (
            accountSummary.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No crypto accounts yet. Add your first account.</p>
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.accountsTable}>
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Current MYR</th>
                      <th>Current USD</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountSummary.map((account) => (
                      <tr key={account.id}>
                        <td><strong>{account.name}</strong></td>
                        <td>{formatCurrency(account.currentMYR || 0, 'MYR')}</td>
                        <td>{formatCurrency(account.currentUSD || 0, 'USD')}</td>
                        <td>
                          <div className={styles.actionButtons}>
                            <button
                              className={styles.editButton}
                              onClick={() => setEditingAccount(account)}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              className={styles.deleteButton}
                              onClick={() => {
                                if (confirm('Delete this account? This will not delete associated holdings.')) {
                                  deleteCryptoAccount(account.id);
                                }
                              }}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <CryptoAccountForm
              account={editingAccount === 'new' ? undefined : editingAccount}
              onCancel={() => setEditingAccount(null)}
            />
          )}
        </section>
      </div>
    </div>
  );
};

export default CryptoTrackerPage;

