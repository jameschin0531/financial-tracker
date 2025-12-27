import React, { useState } from 'react';
import { useFinancialData } from '../context/FinancialDataContext';
import { Liability } from '../types/financial';
import LiabilityForm from '../components/Forms/LiabilityForm';
import { calculateTotalLiabilities } from '../services/calculations';
import { formatCurrency, formatCurrencyWithRate } from '../utils/formatters';
import styles from './Pages.module.css';

const LiabilitiesPage: React.FC = () => {
  const { data, deleteLiability } = useFinancialData();
  const [editingLiability, setEditingLiability] = useState<Liability | undefined>(undefined);
  const totalLiabilities = calculateTotalLiabilities(data.liabilities);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Liabilities</h1>
        <div className={styles.pageSummary}>
          <span className={styles.summaryLabel}>Total Liabilities:</span>
          <span className={styles.summaryValue}>{formatCurrency(totalLiabilities)}</span>
        </div>
      </div>

      <div className={styles.pageContent}>
        <div className={styles.contentGrid}>
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>
              {editingLiability ? 'Edit Liability' : 'Add New Liability'}
            </h2>
            <LiabilityForm
              editingLiability={editingLiability}
              onCancel={() => setEditingLiability(undefined)}
            />
          </div>

          <div className={styles.listSection}>
            <h2 className={styles.sectionTitle}>Your Liabilities ({data.liabilities.length})</h2>
            {data.liabilities.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No liabilities added yet. Add your first liability using the form on the left.</p>
              </div>
            ) : (
              <div className={styles.list}>
                {data.liabilities.map((liability) => (
                  <div key={liability.id} className={styles.listItem}>
                    <div className={styles.listItemContent}>
                      <h3 className={styles.listItemTitle}>{liability.name}</h3>
                      <p className={styles.listItemSubtitle}>
                        {liability.category} • {liability.currency}
                      </p>
                      {liability.interestRate && (
                        <p className={styles.listItemSubtitle}>
                          Interest Rate: {liability.interestRate}%
                        </p>
                      )}
                      <p className={styles.listItemDate}>
                        {new Date(liability.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className={styles.listItemActions}>
                      <div className={styles.valueContainer}>
                        <span className={styles.listItemValue}>
                          {formatCurrencyWithRate(liability.amount, liability.currency, liability.exchangeRate)}
                        </span>
                      </div>
                      <button
                        className={styles.editButton}
                        onClick={() => setEditingLiability(liability)}
                        aria-label="Edit liability"
                        title="Edit liability"
                      >
                        ✏️
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => deleteLiability(liability.id)}
                        aria-label="Delete liability"
                        title="Delete liability"
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

export default LiabilitiesPage;

