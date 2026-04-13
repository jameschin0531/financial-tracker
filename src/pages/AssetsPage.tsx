import { useState, useEffect } from 'react';
import { useFinancialData } from '../context/FinancialDataContext';
import { useToast } from '../context/ToastContext';
import type { Asset } from '../types/financial';
import AssetForm from '../components/Forms/AssetForm';
import ConfirmModal from '../components/Layout/ConfirmModal';
import { calculateTotalAssets, calculateCurrentAssets, calculateFixedAssets } from '../services/calculations';
import { calculateTotalPortfolioValue } from '../services/stockCalculations';
import { calculateTotalCryptoPortfolioValue } from '../services/cryptoCalculations';
import { getUSDToMYRRate } from '../services/exchangeRateService';
import { buildUsdAssetRefreshUpdates } from '../services/assetCurrencyRefresh';
import { formatCurrency, formatCurrencyWithRate } from '../utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const AssetsPage: React.FC = () => {
  const { data, deleteAsset, updateAsset } = useFinancialData();
  const { showToast } = useToast();
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>(undefined);
  const [totalAssets, setTotalAssets] = useState(0);
  const [stockPortfolioValue, setStockPortfolioValue] = useState(0);
  const [cryptoPortfolioValue, setCryptoPortfolioValue] = useState(0);
  const [refreshingUsdAssets, setRefreshingUsdAssets] = useState(false);
  const [usdRefreshMessage, setUsdRefreshMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);

  const currentAssets = calculateCurrentAssets(data.assets);
  const fixedAssets = calculateFixedAssets(data.assets);
  const usdAssetCount = data.assets.filter((asset) => asset.currency === 'USD').length;

  useEffect(() => {
    const calculateValues = async () => {
      const total = await calculateTotalAssets(data.assets, data.stockHoldings, data.cryptoHoldings);
      const stockValue = await calculateTotalPortfolioValue(data.stockHoldings);
      const cryptoValue = await calculateTotalCryptoPortfolioValue(data.cryptoHoldings);

      setTotalAssets(total);
      setStockPortfolioValue(stockValue.myr);
      setCryptoPortfolioValue(cryptoValue.myr);
    };

    calculateValues();
  }, [data.assets, data.stockHoldings, data.cryptoHoldings]);

  const handleRefreshUsdAssets = async () => {
    if (refreshingUsdAssets || usdAssetCount === 0) {
      return;
    }

    setRefreshingUsdAssets(true);
    setUsdRefreshMessage(null);

    try {
      const usdToMyrRate = await getUSDToMYRRate();
      const updates = buildUsdAssetRefreshUpdates(data.assets, usdToMyrRate);

      updates.forEach((update) => {
        updateAsset(update.id, update.asset);
      });

      const msg = updates.length > 0
        ? `Updated ${updates.length} USD asset${updates.length === 1 ? '' : 's'} with rate ${usdToMyrRate.toFixed(4)}.`
        : 'No USD assets to update.';
      setUsdRefreshMessage(msg);
      showToast(msg, 'success');
    } catch (error) {
      console.error('Error refreshing USD asset rates:', error);
      setUsdRefreshMessage('Failed to refresh USD currency rate.');
      showToast('Failed to refresh USD currency rate.', 'error');
    } finally {
      setRefreshingUsdAssets(false);
    }
  };

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      deleteAsset(deleteTarget.id);
      showToast(`Deleted "${deleteTarget.name}"`, 'success');
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Assets</h1>
          <Button
            variant="outline"
            onClick={handleRefreshUsdAssets}
            disabled={refreshingUsdAssets || usdAssetCount === 0}
          >
            {refreshingUsdAssets ? 'Refreshing USD...' : 'Refresh USD Currency'}
          </Button>
        </div>
        {usdRefreshMessage && (
          <p className="text-sm text-muted-foreground">{usdRefreshMessage}</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">Current Assets</p>
              <p className="text-lg font-semibold">{formatCurrency(currentAssets)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">Fixed Assets</p>
              <p className="text-lg font-semibold">{formatCurrency(fixedAssets)}</p>
            </CardContent>
          </Card>
          {stockPortfolioValue > 0 && (
            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Stock Portfolio</p>
                <p className="text-lg font-semibold">{formatCurrency(stockPortfolioValue)}</p>
                <p className="text-xs text-muted-foreground">
                  {data.stockHoldings.length} holding{data.stockHoldings.length !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          )}
          {cryptoPortfolioValue > 0 && (
            <Card>
              <CardContent>
                <p className="text-sm text-muted-foreground">Crypto Portfolio</p>
                <p className="text-lg font-semibold">{formatCurrency(cryptoPortfolioValue)}</p>
                <p className="text-xs text-muted-foreground">
                  {data.cryptoHoldings.length} holding{data.cryptoHoldings.length !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">Total Assets</p>
              <p className="text-lg font-semibold">{formatCurrency(totalAssets)}</p>
              <p className="text-xs text-muted-foreground">
                {data.assets.length} asset{data.assets.length !== 1 ? 's' : ''}
                {data.stockHoldings.length > 0 && ` + ${data.stockHoldings.length} stock${data.stockHoldings.length !== 1 ? 's' : ''}`}
                {data.cryptoHoldings.length > 0 && ` + ${data.cryptoHoldings.length} crypto${data.cryptoHoldings.length !== 1 ? 's' : ''}`}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {editingAsset ? 'Edit Asset' : 'Add New Asset'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AssetForm
              editingAsset={editingAsset}
              onCancel={() => setEditingAsset(undefined)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Assets ({data.assets.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {data.assets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <svg viewBox="0 0 24 24" width="48" height="48" aria-hidden="true" className="mb-4 opacity-30">
                  <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm1 4v1.1a3 3 0 012.4 2.2.8.8 0 11-1.55.37c-.2-.86-.9-1.37-1.85-1.37-.98 0-1.73.52-1.73 1.22 0 .65.38.97 1.9 1.36 1.8.47 3.46 1.03 3.46 3.14 0 1.59-1.1 2.74-2.63 3.06V18a.8.8 0 11-1.6 0v-1.04a3.33 3.33 0 01-2.96-2.74.8.8 0 111.58-.3c.22 1.12 1.14 1.73 2.34 1.73 1.03 0 1.9-.54 1.9-1.37 0-.8-.62-1.15-2.26-1.58-1.64-.43-3.1-1.01-3.1-2.95 0-1.48 1.07-2.57 2.55-2.9V7a.8.8 0 111.6 0z" fill="currentColor" opacity="0.3" />
                </svg>
                <p className="font-medium">No assets yet</p>
                <p className="text-sm">Add your first asset using the form to get started tracking your wealth.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.assets.map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-1">
                      <h3 className="font-medium leading-none">{asset.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {asset.category} | {asset.assetType === 'current' ? 'Current' : 'Fixed'} | {asset.currency}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(asset.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {formatCurrencyWithRate(asset.value, asset.currency, asset.exchangeRate)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingAsset(asset)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteTarget(asset)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {deleteTarget && (
        <ConfirmModal
          title="Delete Asset"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default AssetsPage;
