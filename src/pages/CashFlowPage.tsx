import { useState, useMemo } from 'react';
import { useFinancialData } from '../context/FinancialDataContext';
import { useToast } from '../context/ToastContext';
import { cn } from '@/lib/utils';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Monthly Cash Flow</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{formatCurrency(monthlyIncome, 'MYR')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{formatCurrency(monthlyExpenses, 'MYR')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', cashFlow >= 0 ? 'text-emerald-500' : 'text-red-500')}>
              {formatCurrency(cashFlow, 'MYR')}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">No</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Remark</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableItems.map((item, index) => (
                <TableRow key={item.rowKey}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{item.item}</TableCell>
                  <TableCell>{item.remark}</TableCell>
                  <TableCell className="text-right">
                    {item.income > 0 ? formatCurrency(item.income, 'MYR') : ''}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.expense > 0 ? formatCurrency(item.expense, 'MYR') : ''}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          if (item.type === 'income') {
                            setEditingIncome(item.originalItem as Income);
                          } else {
                            setEditingExpense(item.originalItem as Expense);
                          }
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="xs"
                        onClick={() => setDeleteTarget(item)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {editingIncome ? 'Edit Income' : 'Add Income'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <IncomeForm
              editingIncome={editingIncome}
              onCancel={() => setEditingIncome(undefined)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {editingExpense ? 'Edit Expense' : 'Add Expense'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseForm
              editingExpense={editingExpense}
              onCancel={() => setEditingExpense(undefined)}
            />
          </CardContent>
        </Card>
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
