import React, { useState } from 'react';
import { useFinancialData } from '../context/FinancialDataContext';
import { useToast } from '../context/ToastContext';
import { Liability } from '../types/financial';
import LiabilityForm from '../components/Forms/LiabilityForm';
import ConfirmModal from '../components/Layout/ConfirmModal';
import { calculateTotalLiabilities } from '../services/calculations';
import { formatCurrency, formatCurrencyWithRate } from '../utils/formatters';
import styles from './Pages.module.css';

const LiabilitiesPage: React.FC = () => {
  const { data, deleteLiability } = useFinancialData();
  const { showToast } = useToast();
  const [editingLiability, setEditingLiability] = useState<Liability | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Liability | null>(null);
  const totalLiabilities = calculateTotalLiabilities(data.liabilities);

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      deleteLiability(deleteTarget.id);
      showToast(`Deleted "${deleteTarget.name}"`, 'success');
      setDeleteTarget(null);
    }
  };

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
                <div className={styles.emptyStateIcon}>
                  <svg viewBox="0 0 24 24" width="48" height="48" aria-hidden="true">
                    <path d="M3 7.5A2.5 2.5 0 015.5 5h13A2.5 2.5 0 0121 7.5v9a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 16.5v-9zm2 2v5h14v-5H5zm9 1.5a1 1 0 100 2h3a1 1 0 100-2h-3z" fill="currentColor" opacity="0.3" />
                  </svg>
                </div>
                <p className={styles.emptyStateTitle}>No liabilities yet</p>
                <p className={styles.emptyStateText}>Add your first liability using the form to track what you owe.</p>
              </div>
            ) : (
              <div className={styles.list}>
                {data.liabilities.map((liability) => (
                  <div key={liability.id} className={styles.listItem}>
                    <div className={styles.listItemContent}>
                      <h3 className={styles.listItemTitle}>{liability.name}</h3>
                      <p className={styles.listItemSubtitle}>
                        {liability.category} | {liability.currency}
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
                        Edit
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => setDeleteTarget(liability)}
                        aria-label="Delete liability"
                        title="Delete liability"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {deleteTarget && (
        <ConfirmModal
          title="Delete Liability"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default LiabilitiesPage;
