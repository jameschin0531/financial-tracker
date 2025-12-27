import React, { useState, useMemo } from 'react';
import { useFinancialData } from '../context/FinancialDataContext';
import type { Income, Expense } from '../types/financial';
import IncomeForm from '../components/Forms/IncomeForm';
import ExpenseForm from '../components/Forms/ExpenseForm';
import {
  calculateMonthlyIncome,
  calculateMonthlyExpenses,
  calculateCashFlow,
} from '../services/calculations';
import { formatCurrency, formatCurrencyWithRate } from '../utils/formatters';
import styles from './Pages.module.css';
import cashFlowStyles from './CashFlow.module.css';

const CashFlowPage: React.FC = () => {
  const { data, deleteIncome, deleteExpense } = useFinancialData();
  const [editingIncome, setEditingIncome] = useState<Income | undefined>(undefined);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>(undefined);
  
  const monthlyIncome = calculateMonthlyIncome(data.income);
  const monthlyExpenses = calculateMonthlyExpenses(data.expenses);
  const cashFlow = calculateCashFlow(data.income, data.expenses);

  // Convert income to monthly amounts for display
  const incomeItems = useMemo(() => {
    return data.income.map(income => {
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
          monthlyAmount = 0; // Don't include one-time in monthly view
          break;
      }
      // Convert to MYR if needed
      if (income.currency === 'USD' && income.exchangeRate) {
        monthlyAmount = monthlyAmount * income.exchangeRate;
      } else if (income.currency === 'HKD' && income.exchangeRate) {
        monthlyAmount = monthlyAmount * income.exchangeRate;
      }
      return {
        ...income,
        monthlyAmount,
      };
    }).filter(item => item.monthlyAmount > 0);
  }, [data.income]);

  // Convert expenses to monthly amounts for display
  const expenseItems = useMemo(() => {
    return data.expenses.map(expense => {
      let monthlyAmount = expense.amount;
      // Convert to MYR if needed
      if (expense.currency === 'USD' && expense.exchangeRate) {
        monthlyAmount = monthlyAmount * expense.exchangeRate;
      } else if (expense.currency === 'HKD' && expense.exchangeRate) {
        monthlyAmount = monthlyAmount * expense.exchangeRate;
      }
      return {
        ...expense,
        monthlyAmount,
      };
    });
  }, [data.expenses]);
  
  // Combine all items for table display
  const tableItems = useMemo(() => {
    const items: Array<{
      id: string;
      type: 'income' | 'expense';
      item: string;
      income: number;
      expense: number;
      originalItem: Income | Expense;
    }> = [];
    
    // Add income items
    incomeItems.forEach((income, index) => {
      items.push({
        id: income.id,
        type: 'income',
        item: income.source,
        income: income.monthlyAmount,
        expense: 0,
        originalItem: income,
      });
    });
    
    // Add expense items
    expenseItems.forEach((expense, index) => {
      items.push({
        id: expense.id,
        type: 'expense',
        item: expense.category,
        income: 0,
        expense: expense.monthlyAmount,
        originalItem: expense,
      });
    });
    
    return items;
  }, [incomeItems, expenseItems]);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Monthly Cash Flow</h1>
      </div>

      <div className={styles.pageContent}>
        {/* Cash Flow Table */}
        <div className={cashFlowStyles.tableSection}>
          <div className={cashFlowStyles.tableContainer}>
            <table className={cashFlowStyles.cashFlowTable}>
              <thead>
                <tr>
                  <th className={cashFlowStyles.colNo}>No</th>
                  <th className={cashFlowStyles.colItem}>Item</th>
                  <th className={cashFlowStyles.colIncome}>Income</th>
                  <th className={cashFlowStyles.colExpense}>Expenses</th>
                  <th className={cashFlowStyles.colActions}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tableItems.map((item, index) => (
                  <tr key={item.id}>
                    <td className={cashFlowStyles.colNo}>{index + 1}</td>
                    <td className={cashFlowStyles.colItem}>
                      <strong>{item.item}</strong>
                    </td>
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
                          ✏️
                        </button>
                        <button
                          className={cashFlowStyles.deleteButton}
                          onClick={() => {
                            if (confirm(`Delete ${item.item}?`)) {
                              if (item.type === 'income') {
                                deleteIncome(item.id);
                              } else {
                                deleteExpense(item.id);
                              }
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
                {/* Summary Rows */}
                <tr className={cashFlowStyles.summaryRow}>
                  <td className={cashFlowStyles.colNo}></td>
                  <td className={cashFlowStyles.colItem}><strong>INCOME</strong></td>
                  <td className={cashFlowStyles.colIncome}>
                    <strong>{formatCurrency(monthlyIncome, 'MYR')}</strong>
                  </td>
                  <td className={cashFlowStyles.colExpense}></td>
                  <td className={cashFlowStyles.colActions}></td>
                </tr>
                <tr className={cashFlowStyles.summaryRow}>
                  <td className={cashFlowStyles.colNo}></td>
                  <td className={cashFlowStyles.colItem}><strong>EXPENSE</strong></td>
                  <td className={cashFlowStyles.colIncome}></td>
                  <td className={cashFlowStyles.colExpense}>
                    <strong>{formatCurrency(monthlyExpenses, 'MYR')}</strong>
                  </td>
                  <td className={cashFlowStyles.colActions}></td>
                </tr>
                <tr className={`${cashFlowStyles.summaryRow} ${cashFlowStyles.balanceRow}`}>
                  <td className={cashFlowStyles.colNo}></td>
                  <td className={cashFlowStyles.colItem}><strong>BALANCE</strong></td>
                  <td className={cashFlowStyles.colIncome} colSpan={2}>
                    <strong>{formatCurrency(cashFlow, 'MYR')}</strong>
                  </td>
                  <td className={cashFlowStyles.colActions}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Forms */}
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
    </div>
  );
};

export default CashFlowPage;
