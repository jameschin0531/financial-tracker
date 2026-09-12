import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFinancialData } from '../../context/FinancialDataContext';
import type { Expense, Currency } from '../../types/financial';
import { getUSDToMYRRate } from '../../services/exchangeRateService';
import { preventNumberInputScroll } from './IncomeForm';
import { isCategoryInUse, resolveCategory } from '@/utils/categoryList';
import ConfirmModal from '@/components/Layout/ConfirmModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const expenseFormSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  currency: z.enum(['MYR', 'USD']),
  amount: z.string().min(1, 'Amount is required').refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  description: z.string().optional().or(z.literal('')),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface ExpenseFormProps {
  editingExpense?: Expense;
  onCancel?: () => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ editingExpense, onCancel }) => {
  const { data, addExpense, updateExpense, addExpenseCategory, deleteExpenseCategory } = useFinancialData();
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [exchangeRate, setExchangeRate] = useState<number | undefined>(editingExpense?.exchangeRate);
  const [loadingRate, setLoadingRate] = useState(false);
  const [categoryPendingDelete, setCategoryPendingDelete] = useState<string | null>(null);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      category: editingExpense?.category || data.expenseCategories[0] || '',
      currency: (editingExpense?.currency ?? 'MYR') as 'MYR' | 'USD',
      amount: editingExpense?.amount.toString() || '',
      date: editingExpense?.date || new Date().toISOString().split('T')[0],
      description: editingExpense?.description || '',
    },
  });

  const watchedCurrency = form.watch('currency');

  useEffect(() => {
    if (editingExpense) {
      form.reset({
        category: editingExpense.category || data.expenseCategories[0] || '',
        currency: (editingExpense.currency ?? 'MYR') as 'MYR' | 'USD',
        amount: editingExpense.amount.toString() || '',
        date: editingExpense.date || new Date().toISOString().split('T')[0],
        description: editingExpense.description || '',
      });
      setExchangeRate(editingExpense.exchangeRate);
      setShowNewCategory(false);
      setNewCategory('');
    } else {
      form.reset({
        category: data.expenseCategories[0] || '',
        currency: 'MYR',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
      });
      setExchangeRate(undefined);
      setShowNewCategory(false);
      setNewCategory('');
    }
    // Deliberately does NOT depend on data.expenseCategories: adding or deleting
    // a category re-creates that array, and resetting here would wipe whatever
    // the user is typing into the "new category" field.
  }, [editingExpense, form]);

  // Keep the selected category valid when the list changes (e.g. after a delete,
  // or once remote data finishes loading).
  useEffect(() => {
    if (showNewCategory) {
      return;
    }
    const selected = form.getValues('category');
    if (!selected || !data.expenseCategories.includes(selected)) {
      form.setValue('category', data.expenseCategories[0] || '');
    }
  }, [data.expenseCategories, showNewCategory, form]);

  useEffect(() => {
    if (watchedCurrency === 'USD' && !exchangeRate) {
      setLoadingRate(true);
      getUSDToMYRRate()
        .then(rate => {
          setExchangeRate(rate);
          setLoadingRate(false);
        })
        .catch(() => {
          setLoadingRate(false);
        });
    } else if (watchedCurrency === 'MYR') {
      setExchangeRate(undefined);
    }
  }, [watchedCurrency]);

  const onSubmit = (values: ExpenseFormValues) => {
    if (showNewCategory && !newCategory.trim()) {
      return;
    }

    let finalCategory = values.category;
    if (showNewCategory && newCategory.trim()) {
      finalCategory = commitNewCategory(newCategory) ?? finalCategory;
    }

    const expenseData: Omit<Expense, 'id'> = {
      category: finalCategory || data.expenseCategories[0] || '',
      amount: parseFloat(values.amount),
      currency: values.currency,
      exchangeRate: values.currency === 'USD' ? exchangeRate : undefined,
      date: values.date,
      description: values.description?.trim() || undefined,
    };

    if (editingExpense) {
      updateExpense(editingExpense.id, expenseData);
      onCancel?.();
    } else {
      addExpense(expenseData);
      form.reset({
        category: data.expenseCategories[0] || '',
        currency: 'MYR',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
      });
      setShowNewCategory(false);
      setNewCategory('');
    }
  };

  const selectedCategory = form.watch('category');
  const categoryInUse = isCategoryInUse(data.expenses, selectedCategory);
  const canDeleteCategory =
    !showNewCategory && Boolean(selectedCategory) && data.expenseCategories.length > 1 && !categoryInUse;
  const deleteCategoryHint = categoryInUse
    ? 'This category is used by an existing expense'
    : data.expenseCategories.length <= 1
      ? 'At least one category is required'
      : `Delete category "${selectedCategory}"`;

  /**
   * Add the typed category (if any) and select it. Returns the canonical name
   * that was selected, or null when the input was blank.
   */
  const commitNewCategory = (name: string): string | null => {
    const trimmed = name.trim();
    if (!trimmed) {
      return null;
    }
    // Reuse the stored spelling when the name already exists in another casing,
    // so expenses never reference a category missing from the list.
    const finalCategory = resolveCategory(data.expenseCategories, trimmed);
    addExpenseCategory(finalCategory);
    form.setValue('category', finalCategory);
    setShowNewCategory(false);
    setNewCategory('');
    return finalCategory;
  };

  const handleAddCategory = () => {
    commitNewCategory(newCategory);
  };

  const handleDeleteCategory = () => {
    const target = categoryPendingDelete;
    setCategoryPendingDelete(null);
    if (!target) {
      return;
    }
    const remaining = data.expenseCategories.filter(
      cat => cat.toLowerCase() !== target.toLowerCase(),
    );
    deleteExpenseCategory(target);
    form.setValue('category', remaining[0] || '');
  };

  const handleCategorySelectChange = (value: string) => {
    if (value === '__new__') {
      setShowNewCategory(true);
      form.setValue('category', '');
      setNewCategory('');
    } else {
      setShowNewCategory(false);
      form.setValue('category', value);
      setNewCategory('');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel title="Select the category that best describes your expense">
                  Category
                </FormLabel>
                {!showNewCategory ? (
                  <div className="flex gap-2">
                    <Select value={field.value} onValueChange={handleCategorySelectChange}>
                      <FormControl>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {data.expenseCategories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                        <SelectItem value="__new__">+ Add New Category</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!canDeleteCategory}
                      title={deleteCategoryHint}
                      onClick={() => setCategoryPendingDelete(selectedCategory)}
                    >
                      Delete
                    </Button>
                  </div>
                ) : (
                  <FormControl>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={newCategory}
                        onChange={(e) => {
                          setNewCategory(e.target.value);
                          // Mirror into the form field so validation sees a value
                          // when the expense is submitted with a brand new category.
                          form.setValue('category', e.target.value);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCategory();
                          }
                        }}
                        placeholder="Enter new category name"
                        autoFocus
                      />
                      <Button
                        type="button"
                        onClick={handleAddCategory}
                        disabled={!newCategory.trim()}
                      >
                        Add
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowNewCategory(false);
                          setNewCategory('');
                          form.setValue('category', data.expenseCategories[0] || '');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </FormControl>
                )}
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="currency" render={({ field }) => (
              <FormItem>
                <FormLabel title="Select the currency for this expense">
                  Currency
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="MYR">MYR (Malaysian Ringgit)</SelectItem>
                    <SelectItem value="USD">USD (US Dollar)</SelectItem>
                  </SelectContent>
                </Select>
                {watchedCurrency === 'USD' && (
                  <FormDescription>
                    {loadingRate ? (
                      <span>Loading exchange rate...</span>
                    ) : exchangeRate ? (
                      <span>Rate: 1 USD = {exchangeRate.toFixed(4)} MYR</span>
                    ) : (
                      <span className="text-destructive">Failed to load exchange rate</span>
                    )}
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem>
                <FormLabel title="Enter the amount spent">
                  Amount ({watchedCurrency === 'MYR' ? 'MYR' : 'USD'})
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    onWheel={preventNumberInputScroll}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="date" render={({ field }) => (
              <FormItem>
                <FormLabel title="Select the date when this expense occurred">
                  Date
                </FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel title="Optional: Add a description or note about this expense">
                  Description
                </FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex gap-3 pt-2">
              <Button type="submit">
                {editingExpense ? 'Update Expense' : 'Add Expense'}
              </Button>
              {editingExpense && onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
      </form>

      {categoryPendingDelete && (
        <ConfirmModal
          title="Delete Category"
          message={`Are you sure you want to delete the category "${categoryPendingDelete}"? This action cannot be undone.`}
          onConfirm={handleDeleteCategory}
          onCancel={() => setCategoryPendingDelete(null)}
        />
      )}
    </Form>
  );
};

export default ExpenseForm;
