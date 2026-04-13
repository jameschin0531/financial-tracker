import React, { useState, useEffect } from 'react';
import { useFinancialData } from '../context/FinancialDataContext';
import type { StockHolding, TradingAccount, Deposit } from '../types/financial';
import { getStockPricesWithMeta } from '../services/stockPriceService';
import { getUSDToMYRRate, getUSDToHKDRate } from '../services/exchangeRateService';
import {
  calculateTotalPortfolioValue,
  calculatePortfolioAllocation,
  calculateAccountSummary,
  calculateHoldingPandL,
} from '../services/stockCalculations';
import { formatCurrency, formatCurrencyWithRate } from '../utils/formatters';
import { groupHoldingsByCode, filterGroupedHoldings, sortGroupedHoldings, type GroupedHolding } from '../utils/stockGrouping';
import StockHoldingForm from '../components/Stocks/StockHoldingForm';
import TradingAccountForm from '../components/Stocks/TradingAccountForm';
import DepositForm from '../components/Stocks/DepositForm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ACCOUNT_COLORS: Record<string, string> = {
  webull: 'bg-blue-600 text-white',
  tiger: 'bg-yellow-500 text-black',
  etoro: 'bg-green-600 text-white',
  moomoo: 'bg-orange-500 text-white',
  cash: 'bg-muted text-muted-foreground',
};

const getBadgeColor = (name: string): string => {
  return ACCOUNT_COLORS[name.toLowerCase()] ?? 'bg-primary text-primary-foreground';
};
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';


interface RefreshMeta {
  durationMs: number;
  updatedCount: number;
  missingCount: number;
  sourceSummary: string;
}

const StockTrackerPage: React.FC = () => {
  const {
    data,
    updateStockPrices,
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
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterPandL, setFilterPandL] = useState<string>('all');
  const [filterPortionMin, setFilterPortionMin] = useState<string>('');
  const [filterPortionMax, setFilterPortionMax] = useState<string>('');
  const [sortBy, setSortBy] = useState<'pandl-desc' | 'pandl-asc' | 'portion-desc' | 'portion-asc' | 'value-desc' | 'value-asc'>('value-desc');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [exchangeRates, setExchangeRates] = useState<{ usdToMyr: number; usdToHkd: number }>({ usdToMyr: 4.7, usdToHkd: 7.8 });
  const [refreshMeta, setRefreshMeta] = useState<RefreshMeta | null>(null);
  const [refreshWarning, setRefreshWarning] = useState<string | null>(null);

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

  const [groupedHoldings, setGroupedHoldings] = useState<Array<GroupedHolding>>([]);

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
  const totalPortfolioPandL = groupedHoldings.reduce((sum, group) => sum + group.totalPandL.myr, 0);
  const totalPortfolioCostBasis = portfolioValue.myr - totalPortfolioPandL;
  const totalPortfolioPandLPercentage = totalPortfolioCostBasis > 0
    ? (totalPortfolioPandL / totalPortfolioCostBasis) * 100
    : 0;
  const totalInitialCapitalMyr = accountSummary.reduce((sum, account) => {
    return sum + (account.initialMYR || 0);
  }, 0);
  const totalPandLFromInitialCapital = portfolioValue.myr - totalInitialCapitalMyr;
  const totalPandLFromInitialCapitalPercentage = totalInitialCapitalMyr > 0
    ? (totalPandLFromInitialCapital / totalInitialCapitalMyr) * 100
    : 0;

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
    const refreshTimingLabel = 'stock-refresh-total';
    const refreshStartedAt = performance.now();
    const symbols = [...new Set(
      data.stockHoldings
        .filter(h => h.stockType !== 'Cash')
        .map(h => h.code)
    )];

    console.time(refreshTimingLabel);
    setLoadingPrices(true);
    setRefreshWarning(null);

    try {
      const priceUpdate = await getStockPricesWithMeta(symbols);
      const sourceCounts = Array.from(priceUpdate.sourceBySymbol.values()).reduce<Record<string, number>>(
        (acc, source) => {
          acc[source] = (acc[source] ?? 0) + 1;
          return acc;
        },
        {},
      );
      const sourceSummary = Object.entries(sourceCounts)
        .map(([source, count]) => `${source}:${count}`)
        .join(', ');
      const totalDurationMs = performance.now() - refreshStartedAt;

      updateStockPrices(priceUpdate.prices);
      setRefreshMeta({
        durationMs: totalDurationMs,
        updatedCount: priceUpdate.prices.size,
        missingCount: priceUpdate.missing.length,
        sourceSummary: sourceSummary || 'none',
      });

      if (priceUpdate.missing.length > 0) {
        setRefreshWarning(
          `Partial update: missing ${priceUpdate.missing.length} symbol(s). Existing prices were kept.`,
        );
      }
    } catch (error) {
      console.error('Error updating prices:', error);
      setRefreshWarning('Failed to update stock prices. Please try again.');
    } finally {
      const refreshDurationMs = performance.now() - refreshStartedAt;
      console.timeEnd(refreshTimingLabel);
      console.log(
        `[stock-refresh] symbols=${symbols.length} durationMs=${refreshDurationMs.toFixed(2)}`,
      );
      setLoadingPrices(false);
    }
  };

  const formatMarketPrice = (price: number | undefined, currency: string, stockType?: string) => {
    if (price === undefined) {
      return stockType === 'Cash'
        ? <Badge className={getBadgeColor('Cash')}>Cash</Badge>
        : <span className="text-muted-foreground">No price</span>;
    }
    if (currency === 'HKD') {
      return formatCurrency(price * exchangeRates.usdToHkd, 'HKD');
    }
    if (currency === 'MYR') {
      return formatCurrency(price * exchangeRates.usdToMyr, 'MYR');
    }
    return formatCurrency(price, 'USD');
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Stock Tracker</h1>
          <Button
            onClick={handleUpdatePrices}
            disabled={loadingPrices || data.stockHoldings.length === 0}
          >
            {loadingPrices
              ? 'Updating prices...'
              : refreshMeta
                ? `Updated ${refreshMeta.updatedCount}/${refreshMeta.updatedCount + refreshMeta.missingCount} in ${(refreshMeta.durationMs / 1000).toFixed(1)}s`
                : 'Update Prices'}
          </Button>
        </div>
        {(refreshMeta || refreshWarning) && (
          <div className="flex flex-wrap gap-2 text-sm">
            {refreshMeta && (
              <span className="text-muted-foreground">Sources: {refreshMeta.sourceSummary}</span>
            )}
            {refreshWarning && (
              <span className="text-amber-600 dark:text-amber-400">{refreshWarning}</span>
            )}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
              <p className="text-lg font-semibold">{formatCurrency(portfolioValue.myr, 'MYR')}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(portfolioValue.usd, 'USD')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">Total P&L</p>
              <p className={cn("text-lg font-semibold", totalPortfolioPandL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                {formatCurrency(totalPortfolioPandL, 'MYR')}
              </p>
              <p className="text-xs text-muted-foreground">
                {`${totalPortfolioPandLPercentage >= 0 ? '+' : ''}${totalPortfolioPandLPercentage.toFixed(1)}%`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">Total P&L (Initial Capital)</p>
              <p className={cn("text-lg font-semibold", totalPandLFromInitialCapital >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                {formatCurrency(totalPandLFromInitialCapital, 'MYR')}
              </p>
              <p className="text-xs text-muted-foreground">
                {`${totalPandLFromInitialCapitalPercentage >= 0 ? '+' : ''}${totalPandLFromInitialCapitalPercentage.toFixed(1)}% from ${formatCurrency(totalInitialCapitalMyr, 'MYR')}`}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Investment Holdings */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Investment Holdings</h2>
          <Button onClick={() => setEditingHolding('new')}>+ Add Holding</Button>
        </div>

        {editingHolding === null && data.stockHoldings.length === 0 ? (
          <Card>
            <CardContent>
              <p className="py-8 text-center text-muted-foreground">No stock holdings yet. Add your first holding to get started.</p>
            </CardContent>
          </Card>
        ) : editingHolding === null ? (
          <>
            {/* Filters */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Account</Label>
                <Select value={filterAccount} onValueChange={setFilterAccount}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {data.tradingAccounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.name}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">P&L</Label>
                <Select value={filterPandL} onValueChange={setFilterPandL}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="profit">Profit Only</SelectItem>
                    <SelectItem value="loss">Loss Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Portion</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={filterPortionMin}
                    onChange={(e) => setFilterPortionMin(e.target.value)}
                    className="w-16 sm:w-20"
                    placeholder="Min %"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={filterPortionMax}
                    onChange={(e) => setFilterPortionMax(e.target.value)}
                    className="w-16 sm:w-20"
                    placeholder="Max %"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Sort By</Label>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="value-desc">Value (High to Low)</SelectItem>
                    <SelectItem value="value-asc">Value (Low to High)</SelectItem>
                    <SelectItem value="pandl-desc">P&L (High to Low)</SelectItem>
                    <SelectItem value="pandl-asc">P&L (Low to High)</SelectItem>
                    <SelectItem value="portion-desc">Portion (High to Low)</SelectItem>
                    <SelectItem value="portion-asc">Portion (Low to High)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterAccount('all');
                  setFilterPandL('all');
                  setFilterPortionMin('');
                  setFilterPortionMax('');
                  setSortBy('value-desc');
                }}
              >
                Clear Filters
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>CODE</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Market Price</TableHead>
                  <TableHead>AVG Price</TableHead>
                  <TableHead>MV USD</TableHead>
                  <TableHead>MV MYR</TableHead>
                  <TableHead>P&L</TableHead>
                  <TableHead>Portion</TableHead>
                  <TableHead>Accounts</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedGroupedHoldings.map((group) => {
                  const isExpanded = expandedGroups.has(group.code);
                  const hasMultipleHoldings = group.holdings.length > 1;
                  const singleHolding = hasMultipleHoldings ? null : group.holdings[0];

                  return (
                    <React.Fragment key={group.code}>
                      <TableRow
                        className={cn("cursor-default", hasMultipleHoldings && "cursor-pointer", isExpanded && "bg-muted/50")}
                        onClick={() => hasMultipleHoldings && toggleGroup(group.code)}
                      >
                        <TableCell>
                          {hasMultipleHoldings && (
                            <span className="text-muted-foreground">{isExpanded ? 'v' : '>'}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-semibold">{group.code}</span>
                            {group.name && <div className="text-xs text-muted-foreground">{group.name}</div>}
                            {hasMultipleHoldings && (
                              <div className="text-xs text-muted-foreground">
                                {group.holdings.length} holding{group.holdings.length !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{group.totalQuantity.toFixed(4)}</TableCell>
                        <TableCell>{formatMarketPrice(group.weightedAvgMarketPrice, group.currency, group.stockType)}</TableCell>
                        <TableCell>
                          {group.weightedAvgAvgPrice !== undefined
                            ? formatCurrency(group.weightedAvgAvgPrice, group.currency as 'MYR' | 'USD' | 'HKD')
                            : '-'}
                        </TableCell>
                        <TableCell>{formatCurrency(group.totalMVUSD, 'USD')}</TableCell>
                        <TableCell>{formatCurrency(group.totalMVMYR, 'MYR')}</TableCell>
                        <TableCell className={cn(group.totalPandL.myr >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                          {formatCurrency(group.totalPandL.myr, 'MYR')} ({group.totalPandL.percentage.toFixed(1)}%)
                        </TableCell>
                        <TableCell>{group.totalPortion.toFixed(1)}%</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {group.accounts.map(acc => (
                              <Badge key={acc} className={getBadgeColor(acc)}>{acc}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {hasMultipleHoldings ? (
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleGroup(group.code);
                              }}
                            >
                              {isExpanded ? 'Collapse' : 'Expand'}
                            </Button>
                          ) : singleHolding ? (
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingHolding(singleHolding);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Delete this holding?')) {
                                    deleteStockHolding(singleHolding.id);
                                  }
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          ) : null}
                        </TableCell>
                      </TableRow>

                      {isExpanded && hasMultipleHoldings && group.holdings.map((holding) => {
                        let marketValueUSD = 0;
                        if (holding.marketPrice) {
                          if (holding.currency === 'HKD') {
                            const marketValueHKD = holding.quantity * holding.marketPrice;
                            marketValueUSD = marketValueHKD / exchangeRates.usdToHkd;
                          } else {
                            marketValueUSD = holding.quantity * holding.marketPrice;
                          }
                        }
                        const myrValue = marketValueUSD * exchangeRates.usdToMyr;
                        const usdValue = marketValueUSD;

                        const portion = portfolioValue.myr > 0
                          ? (myrValue / portfolioValue.myr) * 100
                          : 0;
                        const pnl = calculateHoldingPandL(holding);

                        return (
                          <TableRow key={holding.id} className="bg-muted/30">
                            <TableCell />
                            <TableCell>
                              <span className="mr-1 text-muted-foreground">--</span>
                              {holding.name || holding.code}
                            </TableCell>
                            <TableCell>
                              {holding.stockType === 'Cash'
                                ? '1.0000'
                                : holding.quantity.toFixed(4)}
                            </TableCell>
                            <TableCell>
                              {holding.marketPrice
                                ? (() => {
                                    if (holding.currency === 'HKD') {
                                      return formatCurrency(holding.marketPrice * exchangeRates.usdToHkd, 'HKD');
                                    }
                                    if (holding.currency === 'MYR') {
                                      return formatCurrency(holding.marketPrice * exchangeRates.usdToMyr, 'MYR');
                                    }
                                    return formatCurrency(holding.marketPrice, 'USD');
                                  })()
                                : <span className="text-muted-foreground">No price</span>}
                              {holding.stockType === 'Cash' && (
                                <Badge className={cn(getBadgeColor('Cash'), 'ml-1')}>Cash</Badge>
                              )}
                            </TableCell>
                            <TableCell>{formatCurrency(holding.avgPrice, holding.currency)}</TableCell>
                            <TableCell>{formatCurrency(usdValue, 'USD')}</TableCell>
                            <TableCell>{formatCurrency(myrValue, 'MYR')}</TableCell>
                            <TableCell className={cn(pnl.myr >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                              {formatCurrency(pnl.myr, 'MYR')} ({pnl.percentage.toFixed(1)}%)
                            </TableCell>
                            <TableCell>{portion.toFixed(1)}%</TableCell>
                            <TableCell>{holding.account}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="outline"
                                  size="xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingHolding(holding);
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm('Delete this holding?')) {
                                      deleteStockHolding(holding.id);
                                    }
                                  }}
                                >
                                  Delete
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
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
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Asset Allocation Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {allocation.map((item) => (
              <Card key={item.type}>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{item.type}</p>
                  <p className="text-lg font-semibold">{formatCurrency(item.value, 'MYR')}</p>
                  <p className="text-xs text-muted-foreground">{item.percentage.toFixed(2)}%</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Account Summary */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Account Summary</h2>
          <Button onClick={() => setEditingAccount('new')}>+ Add Account</Button>
        </div>

        {editingAccount === null ? (
          accountSummary.length === 0 ? (
            <Card>
              <CardContent>
                <p className="py-8 text-center text-muted-foreground">No trading accounts yet. Add your first account.</p>
              </CardContent>
            </Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Initial Invested</TableHead>
                  <TableHead>Current MYR</TableHead>
                  <TableHead>Current USD</TableHead>
                  <TableHead>P&L</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountSummary.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell>{formatCurrency(account.initialMYR || 0, 'MYR')}</TableCell>
                    <TableCell>{formatCurrency(account.currentMYR || 0, 'MYR')}</TableCell>
                    <TableCell>{formatCurrency(account.currentUSD || 0, 'USD')}</TableCell>
                    <TableCell className={cn(account.pnlMYR >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                      {formatCurrency(account.pnlMYR || 0, 'MYR')} ({account.pnlPercentage >= 0 ? '+' : ''}{account.pnlPercentage.toFixed(2)}%)
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setEditingAccount(account)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="xs"
                          onClick={() => {
                            if (confirm('Delete this account? This will not delete associated holdings.')) {
                              deleteTradingAccount(account.id);
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        ) : (
          <TradingAccountForm
            account={editingAccount === 'new' ? undefined : editingAccount}
            onCancel={() => setEditingAccount(null)}
          />
        )}
      </section>

      {/* Deposit History */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Deposit History</h2>
          <Button onClick={() => setEditingDeposit('new')}>+ Add Deposit</Button>
        </div>

        {editingDeposit === null ? (
          data.deposits.length === 0 ? (
            <Card>
              <CardContent>
                <p className="py-8 text-center text-muted-foreground">No deposits recorded yet. Add your first deposit.</p>
              </CardContent>
            </Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount (MYR)</TableHead>
                  <TableHead>USD</TableHead>
                  <TableHead>SGD</TableHead>
                  <TableHead>AUD</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.deposits
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((deposit) => (
                    <TableRow key={deposit.id}>
                      <TableCell className="font-medium">{deposit.account}</TableCell>
                      <TableCell>{new Date(deposit.date).toLocaleDateString()}</TableCell>
                      <TableCell>{formatCurrency(deposit.amount, 'MYR')}</TableCell>
                      <TableCell>{deposit.usd ? formatCurrency(deposit.usd, 'USD') : '-'}</TableCell>
                      <TableCell>{deposit.sgd ? `SGD ${deposit.sgd.toFixed(2)}` : '-'}</TableCell>
                      <TableCell>{deposit.aud ? `AUD ${deposit.aud.toFixed(2)}` : '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => setEditingDeposit(deposit)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="xs"
                            onClick={() => {
                              if (confirm('Delete this deposit?')) {
                                deleteDeposit(deposit.id);
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
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
  );
};

export default StockTrackerPage;
