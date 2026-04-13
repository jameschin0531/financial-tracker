import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFinancialData } from '../../context/FinancialDataContext';
import type { Liability, Currency } from '../../types/financial';
import { getUSDToMYRRate } from '../../services/exchangeRateService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const liabilityFormSchema = z.object({
  name: z.string().min(1, 'Liability name is required'),
  category: z.string().min(1, 'Category is required'),
  currency: z.enum(['MYR', 'USD']),
  amount: z.string().min(1, 'Amount is required').refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Amount must be greater than 0'),
  interestRate: z.string().optional().or(z.literal('')).refine(
    v => !v || (parseFloat(v) >= 0 && parseFloat(v) <= 100),
    'Interest rate must be between 0 and 100'
  ),
  date: z.string().min(1, 'Date is required'),
});

type LiabilityFormValues = z.infer<typeof liabilityFormSchema>;

interface LiabilityFormProps {
  editingLiability?: Liability;
  onCancel?: () => void;
}

const LiabilityForm: React.FC<LiabilityFormProps> = ({ editingLiability, onCancel }) => {
  const { data, addLiability, updateLiability, addLiabilityCategory } = useFinancialData();
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [exchangeRate, setExchangeRate] = useState<number | undefined>(editingLiability?.exchangeRate);
  const [loadingRate, setLoadingRate] = useState(false);

  const form = useForm<LiabilityFormValues>({
    resolver: zodResolver(liabilityFormSchema),
    defaultValues: {
      name: editingLiability?.name || '',
      category: editingLiability?.category || data.liabilityCategories[0] || '',
      currency: (editingLiability?.currency ?? 'MYR') as 'MYR' | 'USD',
      amount: editingLiability?.amount.toString() || '',
      interestRate: editingLiability?.interestRate?.toString() || '',
      date: editingLiability?.date || new Date().toISOString().split('T')[0],
    },
  });

  const watchedCurrency = form.watch('currency');

  useEffect(() => {
    if (editingLiability) {
      form.reset({
        name: editingLiability.name || '',
        category: editingLiability.category || data.liabilityCategories[0] || '',
        currency: (editingLiability.currency ?? 'MYR') as 'MYR' | 'USD',
        amount: editingLiability.amount.toString() || '',
        interestRate: editingLiability.interestRate?.toString() || '',
        date: editingLiability.date,
      });
      setExchangeRate(editingLiability.exchangeRate);
      setShowNewCategory(false);
      setNewCategory('');
    } else {
      form.reset({
        name: '',
        category: data.liabilityCategories[0] || '',
        currency: 'MYR',
        amount: '',
        interestRate: '',
        date: new Date().toISOString().split('T')[0],
      });
      setExchangeRate(undefined);
      setShowNewCategory(false);
      setNewCategory('');
    }
  }, [editingLiability, data.liabilityCategories, form]);

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

  const onSubmit = (values: LiabilityFormValues) => {
    if (showNewCategory && !newCategory.trim()) {
      return;
    }

    const finalCategory = showNewCategory && newCategory.trim() ? newCategory.trim() : values.category;

    if (showNewCategory && newCategory.trim() && !data.liabilityCategories.includes(newCategory.trim())) {
      addLiabilityCategory(newCategory.trim());
    }

    const liabilityData: Omit<Liability, 'id'> = {
      name: values.name.trim(),
      category: finalCategory,
      amount: parseFloat(values.amount),
      currency: values.currency,
      exchangeRate: values.currency === 'USD' ? exchangeRate : undefined,
      interestRate: values.interestRate ? parseFloat(values.interestRate) : undefined,
      date: values.date,
    };

    if (editingLiability) {
      updateLiability(editingLiability.id, liabilityData);
      onCancel?.();
    } else {
      addLiability(liabilityData);
      form.reset({
        name: '',
        category: showNewCategory && newCategory.trim() ? newCategory.trim() : data.liabilityCategories[0] || '',
        currency: 'MYR',
        amount: '',
        interestRate: '',
        date: new Date().toISOString().split('T')[0],
      });
      setShowNewCategory(false);
      setNewCategory('');
    }
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
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel title="Enter the name of your liability (e.g., Credit Card, Mortgage)">
                  Liability Name
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Credit Card" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel title="Select an existing category or add a new one">
                  Category
                </FormLabel>
                {!showNewCategory ? (
                  <Select value={field.value} onValueChange={handleCategorySelectChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {data.liabilityCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                      <SelectItem value="__new__">+ Add New Category</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <FormControl>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="Enter new category name"
                        autoFocus
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowNewCategory(false);
                          setNewCategory('');
                          form.setValue('category', data.liabilityCategories[0] || '');
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
                <FormLabel title="Select the currency for this liability">
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
                <FormLabel title="Enter the total amount you owe for this liability">
                  Amount Owed ({watchedCurrency === 'MYR' ? 'MYR' : 'USD'})
                </FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="interestRate" render={({ field }) => (
              <FormItem>
                <FormLabel title="Enter the annual interest rate (optional)">
                  Interest Rate (%)
                </FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" max="100" placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="date" render={({ field }) => (
              <FormItem>
                <FormLabel title="Select the date when this liability was recorded">
                  Date
                </FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex gap-3 pt-2">
              <Button type="submit">
                {editingLiability ? 'Update Liability' : 'Add Liability'}
              </Button>
              {editingLiability && onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
      </form>
    </Form>
  );
};

export default LiabilityForm;
