import { useState, useEffect } from 'react';
import { useFinancialData } from '../context/FinancialDataContext';
import type { CryptoHolding, CryptoAccount } from '../types/financial';
import { getCryptoPrices } from '../services/cryptoPriceService';
import {
  calculateTotalCryptoPortfolioValue,
  calculateCryptoHoldingPandL,
  calculateCryptoHoldingMarketValue,
  calculateCryptoAccountSummary,
} from '../services/cryptoCalculations';
import { formatCurrency } from '../utils/formatters';
import CryptoHoldingForm from '../components/Crypto/CryptoHoldingForm';
import CryptoAccountForm from '../components/Crypto/CryptoAccountForm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const CryptoTrackerPage: React.FC = () => {
  const {
    data,
    updateCryptoPrices,
    deleteCryptoHolding,
    deleteCryptoAccount,
  } = useFinancialData();
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [editingHolding, setEditingHolding] = useState<CryptoHolding | 'new' | null>(null);
  const [editingAccount, setEditingAccount] = useState<CryptoAccount | 'new' | null>(null);
  const [portfolioValue, setPortfolioValue] = useState<{ usd: number; myr: number }>({ usd: 0, myr: 0 });
  const [accountSummary, setAccountSummary] = useState<Array<CryptoAccount & { pnlMYR: number; pnlPercentage: number }>>([]);

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

      updateCryptoPrices(prices);
    } catch (error) {
      console.error('Error updating prices:', error);
      alert('Failed to update crypto prices. Please try again.');
    } finally {
      setLoadingPrices(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Crypto Tracker</h1>
          <Button
            onClick={handleUpdatePrices}
            disabled={loadingPrices || data.cryptoHoldings.length === 0}
          >
            {loadingPrices ? 'Updating...' : 'Update Prices'}
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
              <p className="text-lg font-semibold">{formatCurrency(portfolioValue.myr, 'MYR')}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(portfolioValue.usd, 'USD')}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Crypto Holdings Table */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Crypto Holdings</h2>
          <Button onClick={() => setEditingHolding('new')}>+ Add Holding</Button>
        </div>

        {editingHolding === null && data.cryptoHoldings.length === 0 ? (
          <Card>
            <CardContent>
              <p className="py-8 text-center text-muted-foreground">No crypto holdings yet. Add your first holding to get started.</p>
            </CardContent>
          </Card>
        ) : editingHolding === null ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Market Price</TableHead>
                <TableHead>AVG Price</TableHead>
                <TableHead>MV USD</TableHead>
                <TableHead>MV MYR</TableHead>
                <TableHead>P&L</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.cryptoHoldings.map((holding) => {
                const usdRate = holding.exchangeRate || 4.7;
                const { usd: usdValue, myr: myrValue } = calculateCryptoHoldingMarketValue(holding, usdRate);
                const pnl = calculateCryptoHoldingPandL(holding, usdRate);

                return (
                  <TableRow key={holding.id}>
                    <TableCell>
                      <div>
                        <span className="font-semibold">{holding.symbol}</span>
                        {holding.name && <div className="text-xs text-muted-foreground">{holding.name}</div>}
                      </div>
                    </TableCell>
                    <TableCell>{holding.quantity.toFixed(8)}</TableCell>
                    <TableCell>
                      {holding.marketPrice
                        ? formatCurrency(holding.marketPrice, 'USD')
                        : <span className="text-muted-foreground">No price</span>}
                    </TableCell>
                    <TableCell>{formatCurrency(holding.avgPrice, 'USD')}</TableCell>
                    <TableCell>{formatCurrency(usdValue, 'USD')}</TableCell>
                    <TableCell>{formatCurrency(myrValue, 'MYR')}</TableCell>
                    <TableCell className={cn(pnl.myr >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                      {formatCurrency(pnl.myr, 'MYR')} ({pnl.percentage.toFixed(1)}%)
                    </TableCell>
                    <TableCell>{holding.account}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => setEditingHolding(holding)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="xs"
                          onClick={() => {
                            if (confirm('Delete this holding?')) {
                              deleteCryptoHolding(holding.id);
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
            </TableBody>
          </Table>
        ) : (
          <CryptoHoldingForm
            holding={editingHolding === 'new' ? undefined : editingHolding}
            onCancel={() => setEditingHolding(null)}
            accounts={data.cryptoAccounts}
          />
        )}
      </section>

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
                <p className="py-8 text-center text-muted-foreground">No crypto accounts yet. Add your first account.</p>
              </CardContent>
            </Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Current MYR</TableHead>
                  <TableHead>Current USD</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountSummary.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell>{formatCurrency(account.currentMYR || 0, 'MYR')}</TableCell>
                    <TableCell>{formatCurrency(account.currentUSD || 0, 'USD')}</TableCell>
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
                              deleteCryptoAccount(account.id);
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
          <CryptoAccountForm
            account={editingAccount === 'new' ? undefined : editingAccount}
            onCancel={() => setEditingAccount(null)}
          />
        )}
      </section>
    </div>
  );
};

export default CryptoTrackerPage;
