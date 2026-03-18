import React, { useState, useMemo } from 'react';
import { useFinancialData } from '../context/FinancialDataContext';
import { useToast } from '../context/ToastContext';
import type { Income, Expense } from '../types/financial';
import IncomeForm from '../components/Forms/IncomeForm';
import ExpenseForm from '../components/Forms/ExpenseForm';
import ConfirmModal from '../components/Layout/ConfirmModal';
import {
  calculateMonthlyIncome,
  calculateMonthlyExpenses,
  calculateCashFlow,
} from '../services/calculations';
import { formatCurrency } from '../utils/formatters';
import styles from './Pages.module.css';
import cashFlowStyles from './CashFlow.module.css';

export interface CashFlowTableItem {
  id: string;
  rowKey: string;
  type: 'income' | 'expense';
  item: string;
  remark: string;
  income: number;
  expense: number;
  originalItem: Income | Expense;
}

const toMonthlyIncomeAmount = (income: Income): number => {
  let monthlyAmount = 0;
  switch (income.frequency) {
    case 'weekly':
      monthlyAmount = income.amount * 4.33;
      break;
    case 'bi-weekly':
      monthlyAmount = income.amount * 2.17;
      break;
    case 'monthly':
      monthlyAmount = income.amount;
      break;
    case 'yearly':
      monthlyAmount = income.amount / 12;
      break;
    case 'one-time':
      monthlyAmount = 0;
      break;
  }

  if ((income.currency === 'USD' || income.currency === 'HKD') && income.exchangeRate) {
    return monthlyAmount * income.exchangeRate;
  }

  return monthlyAmount;
};

const toMonthlyExpenseAmount = (expense: Expense): number => {
  if ((expense.currency === 'USD' || expense.currency === 'HKD') && expense.exchangeRate) {
    return expense.amount * expense.exchangeRate;
  }

  return expense.amount;
};

export const buildCashFlowTableItems = (income: Income[], expenses: Expense[]): CashFlowTableItem[] => {
  const incomeItems = income
    .map((entry) => ({
      ...entry,
      monthlyAmount: toMonthlyIncomeAmount(entry),
    }))
    .filter((entry) => entry.monthlyAmount > 0);

  const expenseItems = expenses.map((entry) => ({
    ...entry,
    monthlyAmount: toMonthlyExpenseAmount(entry),
  }));

  return [
    ...incomeItems.map((entry) => ({
      id: entry.id,
      rowKey: `income-${entry.id}`,
      type: 'income' as const,
      item: entry.source,
      remark: '-',
      income: entry.monthlyAmount,
      expense: 0,
      originalItem: entry,
    })),
    ...expenseItems.map((entry) => ({
      id: entry.id,
      rowKey: `expense-${entry.id}`,
      type: 'expense' as const,
      item: entry.category,
      remark: entry.description?.trim() || '-',
      income: 0,
      expense: entry.monthlyAmount,
      originalItem: entry,
    })),
  ];
};

export const shouldDeleteCashFlowItem = (
  itemName: string,
  confirmFn?: ((message?: string) => boolean),
): boolean => {
  if (typeof confirmFn !== 'function') {
    return true;
  }

  try {
    return confirmFn(`Delete ${itemName}?`) !== false;
  } catch {
    return true;
  }
};

const CashFlowPage: React.FC = () => {
  const { data, deleteIncome, deleteExpense } = useFinancialData();
  const { showToast } = useToast();
  const [editingIncome, setEditingIncome] = useState<Income | undefined>(undefined);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<CashFlowTableItem | null>(null);

  const monthlyIncome = calculateMonthlyIncome(data.income);
  const monthlyExpenses = calculateMonthlyExpenses(data.expenses);
  const cashFlow = calculateCashFlow(data.income, data.expenses);

  const tableItems = useMemo(() => buildCashFlowTableItems(data.income, data.expenses), [data.income, data.expenses]);

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      if (deleteTarget.type === 'income') {
        deleteIncome(deleteTarget.id);
      } else {
        deleteExpense(deleteTarget.id);
      }
      showToast(`Deleted "${deleteTarget.item}"`, 'success');
      setDeleteTarget(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Monthly Cash Flow</h1>
      </div>

      <div className={styles.pageContent}>
        <div className={cashFlowStyles.tableSection}>
          <div className={cashFlowStyles.tableContainer}>
            <table className={cashFlowStyles.cashFlowTable}>
              <thead>
                <tr>
                  <th className={cashFlowStyles.colNo}>No</th>
                  <th className={cashFlowStyles.colItem}>Item</th>
                  <th className={cashFlowStyles.colRemark}>Remark</th>
                  <th className={cashFlowStyles.colIncome}>Income</th>
                  <th className={cashFlowStyles.colExpense}>Expenses</th>
                  <th className={cashFlowStyles.colActions}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tableItems.map((item, index) => (
                  <tr key={item.rowKey}>
                    <td className={cashFlowStyles.colNo}>{index + 1}</td>
                    <td className={cashFlowStyles.colItem}>
                      <strong>{item.item}</strong>
                    </td>
                    <td className={cashFlowStyles.colRemark}>{item.remark}</td>
                    <td className={cashFlowStyles.colIncome}>
                      {item.income > 0 ? formatCurrency(item.income, 'MYR') : ''}
                    </td>
                    <td className={cashFlowStyles.colExpense}>
                      {item.expense > 0 ? formatCurrency(item.expense, 'MYR') : ''}
                    </td>
                    <td className={cashFlowStyles.colActions}>
                      <div className={cashFlowStyles.actionButtons}>
                        <button
                          className={cashFlowStyles.editButton}
                          onClick={() => {
                            if (item.type === 'income') {
                              setEditingIncome(item.originalItem as Income);
                            } else {
                              setEditingExpense(item.originalItem as Expense);
                            }
                          }}
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button
                          className={cashFlowStyles.deleteButton}
                          onClick={() => setDeleteTarget(item)}
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className={cashFlowStyles.summaryRow}>
                  <td className={cashFlowStyles.colNo}></td>
                  <td className={cashFlowStyles.colItem}><strong>INCOME</strong></td>
                  <td className={cashFlowStyles.colRemark}></td>
                  <td className={cashFlowStyles.colIncome}>
                    <strong>{formatCurrency(monthlyIncome, 'MYR')}</strong>
                  </td>
                  <td className={cashFlowStyles.colExpense}></td>
                  <td className={cashFlowStyles.colActions}></td>
                </tr>
                <tr className={cashFlowStyles.summaryRow}>
                  <td className={cashFlowStyles.colNo}></td>
                  <td className={cashFlowStyles.colItem}><strong>EXPENSE</strong></td>
                  <td className={cashFlowStyles.colRemark}></td>
                  <td className={cashFlowStyles.colIncome}></td>
                  <td className={cashFlowStyles.colExpense}>
                    <strong>{formatCurrency(monthlyExpenses, 'MYR')}</strong>
                  </td>
                  <td className={cashFlowStyles.colActions}></td>
                </tr>
                <tr className={`${cashFlowStyles.summaryRow} ${cashFlowStyles.balanceRow}`}>
                  <td className={cashFlowStyles.colNo}></td>
                  <td className={cashFlowStyles.colItem}><strong>BALANCE</strong></td>
                  <td className={cashFlowStyles.colRemark}></td>
                  <td className={cashFlowStyles.colIncome} colSpan={2}>
                    <strong>{formatCurrency(cashFlow, 'MYR')}</strong>
                  </td>
                  <td className={cashFlowStyles.colActions}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.contentGrid}>
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>
              {editingIncome ? 'Edit Income' : 'Add Income'}
            </h2>
            <IncomeForm
              editingIncome={editingIncome}
              onCancel={() => setEditingIncome(undefined)}
            />
          </div>

          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>
              {editingExpense ? 'Edit Expense' : 'Add Expense'}
            </h2>
            <ExpenseForm
              editingExpense={editingExpense}
              onCancel={() => setEditingExpense(undefined)}
            />
          </div>
        </div>
      </div>

      {deleteTarget && (
        <ConfirmModal
          title={`Delete ${deleteTarget.type === 'income' ? 'Income' : 'Expense'}`}
          message={`Are you sure you want to delete "${deleteTarget.item}"? This action cannot be undone.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default CashFlowPage;
