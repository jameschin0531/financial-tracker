import React, { useState, useEffect } from 'react';
import { useFinancialData } from '../context/FinancialDataContext';
import type { StockHolding, TradingAccount, Deposit } from '../types/financial';
import { getStockPrice, getStockPrices } from '../services/stockPriceService';
import { getUSDToMYRRate, getUSDToHKDRate } from '../services/exchangeRateService';
import {
  calculateTotalPortfolioValue,
  calculatePortfolioAllocation,
  calculateAccountSummary,
  calculateHoldingPandL,
  calculateTotalDeposits,
} from '../services/stockCalculations';
import { formatCurrency, formatCurrencyWithRate } from '../utils/formatters';
import { groupHoldingsByCode, filterGroupedHoldings, sortGroupedHoldings, type GroupedHolding } from '../utils/stockGrouping';
import StockHoldingForm from '../components/Stocks/StockHoldingForm';
import TradingAccountForm from '../components/Stocks/TradingAccountForm';
import DepositForm from '../components/Stocks/DepositForm';
import styles from './StockTracker.module.css';

const StockTrackerPage: React.FC = () => {
  const { 
    data, 
    updateStockPrice, 
    updateStockHolding,
    deleteStockHolding,
    deleteTradingAccount,
    deleteDeposit,
  } = useFinancialData();
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [editingHolding, setEditingHolding] = useState<StockHolding | 'new' | null>(null);
  const [editingAccount, setEditingAccount] = useState<TradingAccount | 'new' | null>(null);
  const [editingDeposit, setEditingDeposit] = useState<Deposit | 'new' | null>(null);
  const [portfolioValue, setPortfolioValue] = useState<{ usd: number; myr: number }>({ usd: 0, myr: 0 });
  const [allocation, setAllocation] = useState<Array<{ type: string; value: number; percentage: number }>>([]);
  const [accountSummary, setAccountSummary] = useState<Array<TradingAccount & { pnlMYR: number; pnlPercentage: number }>>([]);
  // Filter states
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterPandL, setFilterPandL] = useState<string>('all'); // 'all', 'profit', 'loss'
  const [filterPortionMin, setFilterPortionMin] = useState<string>('');
  const [filterPortionMax, setFilterPortionMax] = useState<string>('');
  // Sort state
  const [sortBy, setSortBy] = useState<'pandl-desc' | 'pandl-asc' | 'portion-desc' | 'portion-asc' | 'value-desc' | 'value-asc'>('value-desc');
  // Expanded groups
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [exchangeRates, setExchangeRates] = useState<{ usdToMyr: number; usdToHkd: number }>({ usdToMyr: 4.7, usdToHkd: 7.8 });

  // Fetch exchange rates
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const usdToMyr = await getUSDToMYRRate();
        const usdToHkd = await getUSDToHKDRate();
        setExchangeRates({ usdToMyr, usdToHkd });
      } catch (error) {
        console.error('Error fetching exchange rates:', error);
      }
    };
    fetchRates();
  }, []);

  // Calculate portfolio values
  useEffect(() => {
    const calculateValues = async () => {
      const total = await calculateTotalPortfolioValue(data.stockHoldings);
      const alloc = await calculatePortfolioAllocation(data.stockHoldings);
      const summary = await calculateAccountSummary(data.tradingAccounts, data.stockHoldings, data.cryptoHoldings);
      
      setPortfolioValue(total);
      setAllocation(alloc);
      setAccountSummary(summary);
    };
    
    calculateValues();
  }, [data.stockHoldings, data.tradingAccounts]);

  // Group, filter, and sort holdings
  const [groupedHoldings, setGroupedHoldings] = useState<Array<import('../utils/stockGrouping').GroupedHolding>>([]);
  
  useEffect(() => {
    const loadGroupedHoldings = async () => {
      const grouped = await groupHoldingsByCode(data.stockHoldings, portfolioValue.myr);
      setGroupedHoldings(grouped);
    };
    loadGroupedHoldings();
  }, [data.stockHoldings, portfolioValue.myr]);
  
  const filteredGroupedHoldings = filterGroupedHoldings(
    groupedHoldings,
    filterAccount,
    filterPandL,
    filterPortionMin,
    filterPortionMax
  );
  const sortedGroupedHoldings = sortGroupedHoldings(filteredGroupedHoldings, sortBy);

  const toggleGroup = (code: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(code)) {
        newSet.delete(code);
      } else {
        newSet.add(code);
      }
      return newSet;
    });
  };

  const handleUpdatePrices = async () => {
    setLoadingPrices(true);
    try {
      const symbols = [...new Set(data.stockHoldings.map(h => h.code))];
      const pricesUSD = await getStockPrices(symbols);
      
      // Update prices for all holdings - market prices are always stored in USD
      for (const holding of data.stockHoldings) {
        const priceUSD = pricesUSD.get(holding.code.toUpperCase());
        if (priceUSD !== undefined) {
          // Market price is always in USD regardless of holding currency
          updateStockPrice(holding.id, priceUSD);
        }
      }
    } catch (error) {
      console.error('Error updating prices:', error);
      alert('Failed to update stock prices. Please try again.');
    } finally {
      setLoadingPrices(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div className={styles.headerTop}>
          <h1 className={styles.pageTitle}>Stock Tracker</h1>
          <button
            className={styles.updateButton}
            onClick={handleUpdatePrices}
            disabled={loadingPrices || data.stockHoldings.length === 0}
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
        {/* Investment Holdings Table */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Investment Holdings</h2>
            <button
              className={styles.addButton}
              onClick={() => setEditingHolding('new')}
            >
              + Add Holding
            </button>
          </div>
          
          {editingHolding === null && data.stockHoldings.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No stock holdings yet. Add your first holding to get started.</p>
            </div>
          ) : editingHolding === null ? (
            <>
              {/* Filters */}
              <div className={styles.filtersContainer}>
                <div className={styles.filterGroup}>
                  <label htmlFor="filter-account" className={styles.filterLabel}>Account:</label>
                  <select
                    id="filter-account"
                    value={filterAccount}
                    onChange={(e) => setFilterAccount(e.target.value)}
                    className={styles.filterSelect}
                  >
                    <option value="all">All Accounts</option>
                    {data.tradingAccounts.map(acc => (
                      <option key={acc.id} value={acc.name}>{acc.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className={styles.filterGroup}>
                  <label htmlFor="filter-pnl" className={styles.filterLabel}>P&L:</label>
                  <select
                    id="filter-pnl"
                    value={filterPandL}
                    onChange={(e) => setFilterPandL(e.target.value)}
                    className={styles.filterSelect}
                  >
                    <option value="all">All</option>
                    <option value="profit">Profit Only</option>
                    <option value="loss">Loss Only</option>
                  </select>
                </div>
                
                <div className={styles.filterGroup}>
                  <label htmlFor="filter-portion-min" className={styles.filterLabel}>Portion:</label>
                  <div className={styles.portionFilter}>
                    <input
                      id="filter-portion-min"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={filterPortionMin}
                      onChange={(e) => setFilterPortionMin(e.target.value)}
                      className={styles.filterInput}
                      placeholder="Min %"
                    />
                    <span className={styles.filterSeparator}>-</span>
                    <input
                      id="filter-portion-max"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={filterPortionMax}
                      onChange={(e) => setFilterPortionMax(e.target.value)}
                      className={styles.filterInput}
                      placeholder="Max %"
                    />
                  </div>
                </div>
                
                <div className={styles.filterGroup}>
                  <label htmlFor="sort-by" className={styles.filterLabel}>Sort By:</label>
                  <select
                    id="sort-by"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className={styles.filterSelect}
                  >
                    <option value="value-desc">Value (High to Low)</option>
                    <option value="value-asc">Value (Low to High)</option>
                    <option value="pandl-desc">P&L (High to Low)</option>
                    <option value="pandl-asc">P&L (Low to High)</option>
                    <option value="portion-desc">Portion (High to Low)</option>
                    <option value="portion-asc">Portion (Low to High)</option>
                  </select>
                </div>
                
                <button
                  className={styles.clearFiltersButton}
                  onClick={() => {
                    setFilterAccount('all');
                    setFilterPandL('all');
                    setFilterPortionMin('');
                    setFilterPortionMax('');
                    setSortBy('value-desc');
                  }}
                >
                  Clear Filters
                </button>
              </div>

              <div className={styles.tableContainer}>
                <table className={styles.holdingsTable}>
                  <thead>
                    <tr>
                      <th style={{ width: '30px' }}></th>
                      <th>CODE</th>
                      <th>Quantity</th>
                      <th>Market Price</th>
                      <th>AVG Price</th>
                      <th>MV USD</th>
                      <th>MV MYR</th>
                      <th>P&L</th>
                      <th>Portion</th>
                      <th>Accounts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedGroupedHoldings.map((group) => {
                      const isExpanded = expandedGroups.has(group.code);
                      const hasMultipleHoldings = group.holdings.length > 1;
                      
                      
                      return (
                        <React.Fragment key={group.code}>
                          {/* Main Group Row */}
                          <tr 
                            className={`${styles.groupRow} ${isExpanded ? styles.expanded : ''}`}
                            onClick={() => hasMultipleHoldings && toggleGroup(group.code)}
                            style={{ cursor: hasMultipleHoldings ? 'pointer' : 'default' }}
                          >
                            <td className={styles.expandCell}>
                              {hasMultipleHoldings && (
                                <span className={styles.expandIcon}>
                                  {isExpanded ? '▼' : '▶'}
                                </span>
                              )}
                            </td>
                            <td className={styles.codeCell}>
                              <strong>{group.code}</strong>
                              {group.name && <div className={styles.nameSubtext}>{group.name}</div>}
                              {hasMultipleHoldings && (
                                <div className={styles.groupCount}>
                                  {group.holdings.length} holding{group.holdings.length !== 1 ? 's' : ''}
                                </div>
                              )}
                            </td>
                            <td>{group.totalQuantity.toFixed(4)}</td>
                            <td>
                              {group.weightedAvgMarketPrice !== undefined
                                ? (() => {
                                    // weightedAvgMarketPrice is now always in USD (converted from HKD if needed)
                                    // If currency is HKD or MYR, convert from USD to that currency for display
                                    if (group.currency === 'HKD') {
                                      const marketPriceHKD = group.weightedAvgMarketPrice * exchangeRates.usdToHkd;
                                      return formatCurrency(marketPriceHKD, 'HKD');
                                    } else if (group.currency === 'MYR') {
                                      const marketPriceMYR = group.weightedAvgMarketPrice * exchangeRates.usdToMyr;
                                      return formatCurrency(marketPriceMYR, 'MYR');
                                    } else {
                                      return formatCurrency(group.weightedAvgMarketPrice, 'USD');
                                    }
                                  })()
                                : group.stockType === 'Cash' ? (
                                  <span className={styles.cashBadge}>Cash</span>
                                ) : (
                                  <span className={styles.noPrice}>No price</span>
                                )}
                            </td>
                            <td>
                              {group.weightedAvgAvgPrice !== undefined
                                ? formatCurrency(group.weightedAvgAvgPrice, group.currency as 'MYR' | 'USD' | 'HKD')
                                : '-'}
                            </td>
                            <td>{formatCurrency(group.totalMVUSD, 'USD')}</td>
                            <td>{formatCurrency(group.totalMVMYR, 'MYR')}</td>
                            <td className={group.totalPandL.myr >= 0 ? styles.positive : styles.negative}>
                              {formatCurrency(group.totalPandL.myr, 'MYR')} ({group.totalPandL.percentage.toFixed(1)}%)
                            </td>
                            <td>{group.totalPortion.toFixed(1)}%</td>
                            <td>
                              <div className={styles.accountsList}>
                                {group.accounts.map(acc => (
                                  <span key={acc} className={styles.accountBadge}>{acc}</span>
                                ))}
                              </div>
                            </td>
                          </tr>
                          
                          {/* Expanded Holdings */}
                          {isExpanded && hasMultipleHoldings && group.holdings.map((holding) => {
                            // For HKD holdings, marketPrice is in HKD
                            // For USD and MYR holdings, marketPrice is in USD (from API)
                            // Convert to USD for consistent calculation
                            let marketValueUSD = 0;
                            if (holding.marketPrice) {
                              if (holding.currency === 'HKD') {
                                // Market price is in HKD, convert to USD
                                const marketValueHKD = holding.quantity * holding.marketPrice;
                                marketValueUSD = marketValueHKD / exchangeRates.usdToHkd;
                              } else {
                                // Market price is in USD (for USD and MYR holdings)
                                marketValueUSD = holding.quantity * holding.marketPrice;
                              }
                            }
                            // Use USD to MYR rate for converting market value to MYR
                            const myrValue = marketValueUSD * exchangeRates.usdToMyr;
                            const usdValue = marketValueUSD;
                            
                            const portion = portfolioValue.myr > 0 
                              ? (myrValue / portfolioValue.myr) * 100 
                              : 0;
                            const pnl = calculateHoldingPandL(holding);
                            
                            return (
                              <tr key={holding.id} className={styles.subRow}>
                                <td></td>
                                <td className={styles.subCodeCell}>
                                  <span className={styles.subIndicator}>└─</span>
                                  {holding.account}
                                </td>
                                <td>
                                  {holding.stockType === 'Cash' 
                                    ? '1.0000' 
                                    : holding.quantity.toFixed(4)}
                                </td>
                                <td>
                                  {holding.marketPrice 
                                    ? (() => {
                                        // If currency is HKD or MYR, convert market price from USD to that currency
                                        if (holding.currency === 'HKD') {
                                          const marketPriceHKD = holding.marketPrice * exchangeRates.usdToHkd;
                                          return formatCurrency(marketPriceHKD, 'HKD');
                                        } else if (holding.currency === 'MYR') {
                                          const marketPriceMYR = holding.marketPrice * exchangeRates.usdToMyr;
                                          return formatCurrency(marketPriceMYR, 'MYR');
                                        } else {
                                          return formatCurrency(holding.marketPrice, 'USD');
                                        }
                                      })()
                                    : <span className={styles.noPrice}>No price</span>}
                                  {holding.stockType === 'Cash' && (
                                    <span className={styles.cashBadge}>Cash</span>
                                  )}
                                </td>
                                <td>{formatCurrency(holding.avgPrice, holding.currency)}</td>
                                <td>{formatCurrency(usdValue, 'USD')}</td>
                                <td>{formatCurrency(myrValue, 'MYR')}</td>
                                <td className={pnl.myr >= 0 ? styles.positive : styles.negative}>
                                  {formatCurrency(pnl.myr, 'MYR')} ({pnl.percentage.toFixed(1)}%)
                                </td>
                                <td>{portion.toFixed(1)}%</td>
                                <td>
                                  <div className={styles.actionButtons}>
                                    <button
                                      className={styles.editButton}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingHolding(holding);
                                      }}
                                      title="Edit"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      className={styles.deleteButton}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('Delete this holding?')) {
                                          deleteStockHolding(holding.id);
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
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <StockHoldingForm
              holding={editingHolding === 'new' ? undefined : editingHolding}
              onCancel={() => setEditingHolding(null)}
              accounts={data.tradingAccounts}
            />
          )}
        </section>

        {/* Asset Allocation Summary */}
        {allocation.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Asset Allocation Summary</h2>
            <div className={styles.allocationGrid}>
              {allocation.map((item) => (
                <div key={item.type} className={styles.allocationCard}>
                  <span className={styles.allocationType}>{item.type}</span>
                  <span className={styles.allocationValue}>{formatCurrency(item.value, 'MYR')}</span>
                  <span className={styles.allocationPercentage}>{item.percentage.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </section>
        )}

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
                <p>No trading accounts yet. Add your first account.</p>
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.accountsTable}>
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Initial Invested</th>
                      <th>Current MYR</th>
                      <th>Current USD</th>
                      <th>P&L</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountSummary.map((account) => (
                      <tr key={account.id}>
                        <td><strong>{account.name}</strong></td>
                        <td>{formatCurrency(account.initialMYR || 0, 'MYR')}</td>
                        <td>{formatCurrency(account.currentMYR || 0, 'MYR')}</td>
                        <td>{formatCurrency(account.currentUSD || 0, 'USD')}</td>
                        <td className={account.pnlMYR >= 0 ? styles.positive : styles.negative}>
                          {formatCurrency(account.pnlMYR || 0, 'MYR')} ({account.pnlPercentage >= 0 ? '+' : ''}{account.pnlPercentage.toFixed(2)}%)
                        </td>
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
                                  deleteTradingAccount(account.id);
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
            <TradingAccountForm
              account={editingAccount === 'new' ? undefined : editingAccount}
              onCancel={() => setEditingAccount(null)}
            />
          )}
        </section>

        {/* Deposit History */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Deposit History</h2>
            <button
              className={styles.addButton}
              onClick={() => setEditingDeposit('new')}
            >
              + Add Deposit
            </button>
          </div>
          
          {editingDeposit === null ? (
            data.deposits.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No deposits recorded yet. Add your first deposit.</p>
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.depositsTable}>
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Date</th>
                      <th>Amount (MYR)</th>
                      <th>USD</th>
                      <th>SGD</th>
                      <th>AUD</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.deposits
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((deposit) => (
                        <tr key={deposit.id}>
                          <td><strong>{deposit.account}</strong></td>
                          <td>{new Date(deposit.date).toLocaleDateString()}</td>
                          <td>{formatCurrency(deposit.amount, 'MYR')}</td>
                          <td>{deposit.usd ? formatCurrency(deposit.usd, 'USD') : '-'}</td>
                          <td>{deposit.sgd ? `SGD ${deposit.sgd.toFixed(2)}` : '-'}</td>
                          <td>{deposit.aud ? `AUD ${deposit.aud.toFixed(2)}` : '-'}</td>
                          <td>
                            <div className={styles.actionButtons}>
                              <button
                                className={styles.editButton}
                                onClick={() => setEditingDeposit(deposit)}
                                title="Edit"
                              >
                                ✏️
                              </button>
                              <button
                                className={styles.deleteButton}
                                onClick={() => {
                                  if (confirm('Delete this deposit?')) {
                                    deleteDeposit(deposit.id);
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
            <DepositForm
              deposit={editingDeposit === 'new' ? undefined : editingDeposit}
              onCancel={() => setEditingDeposit(null)}
              accounts={data.tradingAccounts.map(a => a.name)}
            />
          )}
        </section>
      </div>
    </div>
  );
};

export default StockTrackerPage;

