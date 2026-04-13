import { useState } from 'react';
import { useFinancialData } from '../context/FinancialDataContext';
import { useToast } from '../context/ToastContext';
import type { Liability } from '../types/financial';
import LiabilityForm from '../components/Forms/LiabilityForm';
import ConfirmModal from '../components/Layout/ConfirmModal';
import { calculateTotalLiabilities } from '../services/calculations';
import { formatCurrency, formatCurrencyWithRate } from '../utils/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Liabilities</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Total Liabilities:</span>
          <span className="text-lg font-semibold">{formatCurrency(totalLiabilities)}</span>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {editingLiability ? 'Edit Liability' : 'Add New Liability'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LiabilityForm
              editingLiability={editingLiability}
              onCancel={() => setEditingLiability(undefined)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Liabilities ({data.liabilities.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {data.liabilities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <svg viewBox="0 0 24 24" width="48" height="48" aria-hidden="true" className="mb-4 opacity-30">
                  <path d="M3 7.5A2.5 2.5 0 015.5 5h13A2.5 2.5 0 0121 7.5v9a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 16.5v-9zm2 2v5h14v-5H5zm9 1.5a1 1 0 100 2h3a1 1 0 100-2h-3z" fill="currentColor" opacity="0.3" />
                </svg>
                <p className="font-medium">No liabilities yet</p>
                <p className="text-sm">Add your first liability using the form to track what you owe.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.liabilities.map((liability) => (
                  <div key={liability.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <h3 className="font-medium leading-none truncate">{liability.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {liability.category} | {liability.currency}
                        </p>
                        {liability.interestRate && (
                          <p className="text-sm text-muted-foreground">
                            Interest Rate: {liability.interestRate}%
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(liability.date).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="font-semibold text-right shrink-0">
                        {formatCurrencyWithRate(liability.amount, liability.currency, liability.exchangeRate)}
                      </span>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingLiability(liability)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteTarget(liability)}
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
