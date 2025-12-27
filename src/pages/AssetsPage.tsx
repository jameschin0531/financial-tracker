import React, { useState, useEffect } from 'react';
import { useFinancialData } from '../context/FinancialDataContext';
import type { Asset } from '../types/financial';
import AssetForm from '../components/Forms/AssetForm';
import { calculateTotalAssets, calculateCurrentAssets, calculateFixedAssets } from '../services/calculations';
import { calculateTotalPortfolioValue } from '../services/stockCalculations';
import { calculateTotalCryptoPortfolioValue } from '../services/cryptoCalculations';
import { formatCurrency, formatCurrencyWithRate } from '../utils/formatters';
import styles from './Pages.module.css';

const AssetsPage: React.FC = () => {
  const { data, deleteAsset } = useFinancialData();
  const [editingAsset, setEditingAsset] = useState<Asset | undefined>(undefined);
  const [totalAssets, setTotalAssets] = useState(0);
  const [stockPortfolioValue, setStockPortfolioValue] = useState(0);
  const [cryptoPortfolioValue, setCryptoPortfolioValue] = useState(0);
  
  const currentAssets = calculateCurrentAssets(data.assets);
  const fixedAssets = calculateFixedAssets(data.assets);

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

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Assets</h1>
        <div className={styles.assetsSummary}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Current Assets:</span>
            <span className={styles.summaryValue}>{formatCurrency(currentAssets)}</span>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Fixed Assets:</span>
            <span className={styles.summaryValue}>{formatCurrency(fixedAssets)}</span>
          </div>
          {stockPortfolioValue > 0 && (
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Stock Portfolio:</span>
              <span className={styles.summaryValue}>{formatCurrency(stockPortfolioValue)}</span>
              <span className={styles.summarySubtext}>
                {data.stockHoldings.length} holding{data.stockHoldings.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          {cryptoPortfolioValue > 0 && (
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Crypto Portfolio:</span>
              <span className={styles.summaryValue}>{formatCurrency(cryptoPortfolioValue)}</span>
              <span className={styles.summarySubtext}>
                {data.cryptoHoldings.length} holding{data.cryptoHoldings.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Total Assets:</span>
            <span className={styles.summaryValue}>{formatCurrency(totalAssets)}</span>
            <span className={styles.summarySubtext}>
              {data.assets.length} asset{data.assets.length !== 1 ? 's' : ''}
              {data.stockHoldings.length > 0 && ` + ${data.stockHoldings.length} stock${data.stockHoldings.length !== 1 ? 's' : ''}`}
              {data.cryptoHoldings.length > 0 && ` + ${data.cryptoHoldings.length} crypto${data.cryptoHoldings.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.pageContent}>
        <div className={styles.contentGrid}>
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>
              {editingAsset ? 'Edit Asset' : 'Add New Asset'}
            </h2>
            <AssetForm
              editingAsset={editingAsset}
              onCancel={() => setEditingAsset(undefined)}
            />
          </div>

          <div className={styles.listSection}>
            <h2 className={styles.sectionTitle}>Your Assets ({data.assets.length})</h2>
            {data.assets.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No assets added yet. Add your first asset using the form on the left.</p>
              </div>
            ) : (
              <div className={styles.list}>
                {data.assets.map((asset) => (
                  <div key={asset.id} className={styles.listItem}>
                    <div className={styles.listItemContent}>
                      <h3 className={styles.listItemTitle}>{asset.name}</h3>
                      <p className={styles.listItemSubtitle}>
                        {asset.category} • {asset.assetType === 'current' ? 'Current' : 'Fixed'} • {asset.currency}
                      </p>
                      <p className={styles.listItemDate}>
                        {new Date(asset.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className={styles.listItemActions}>
                      <div className={styles.valueContainer}>
                        <span className={styles.listItemValue}>
                          {formatCurrencyWithRate(asset.value, asset.currency, asset.exchangeRate)}
                        </span>
                      </div>
                      <button
                        className={styles.editButton}
                        onClick={() => setEditingAsset(asset)}
                        aria-label="Edit asset"
                        title="Edit asset"
                      >
                        ✏️
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => deleteAsset(asset.id)}
                        aria-label="Delete asset"
                        title="Delete asset"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetsPage;

