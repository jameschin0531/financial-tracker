import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFinancialData } from '../../context/FinancialDataContext';
import type { Income, Currency } from '../../types/financial';
import { getUSDToMYRRate } from '../../services/exchangeRateService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const INCOME_FREQUENCIES: Array<{ value: 'weekly' | 'bi-weekly' | 'monthly' | 'yearly' | 'one-time'; label: string }> = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'one-time', label: 'One-time' },
];

export const preventNumberInputScroll = (event: React.WheelEvent<HTMLInputElement>): void => {
  if (event.currentTarget.type !== 'number') {
    return;
  }

  event.currentTarget.blur();
};

const incomeFormSchema = z.object({
  source: z.string().min(1, 'Income source is required'),
  currency: z.enum(['MYR', 'USD']),
  amount: z.string().min(1, 'Amount is required').refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Amount must be greater than 0'),
  frequency: z.enum(['weekly', 'bi-weekly', 'monthly', 'yearly', 'one-time']),
  date: z.string().min(1, 'Date is required'),
});

type IncomeFormValues = z.infer<typeof incomeFormSchema>;

interface IncomeFormProps {
  editingIncome?: Income;
  onCancel?: () => void;
}

const IncomeForm: React.FC<IncomeFormProps> = ({ editingIncome, onCancel }) => {
  const { addIncome, updateIncome } = useFinancialData();
  const [exchangeRate, setExchangeRate] = useState<number | undefined>(editingIncome?.exchangeRate);
  const [loadingRate, setLoadingRate] = useState(false);

  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeFormSchema),
    defaultValues: {
      source: editingIncome?.source || '',
      currency: (editingIncome?.currency ?? 'MYR') as 'MYR' | 'USD',
      amount: editingIncome?.amount.toString() || '',
      frequency: editingIncome?.frequency || 'monthly',
      date: editingIncome?.date || new Date().toISOString().split('T')[0],
    },
  });

  const watchedCurrency = form.watch('currency');

  useEffect(() => {
    if (editingIncome) {
      form.reset({
        source: editingIncome.source || '',
        currency: (editingIncome.currency ?? 'MYR') as 'MYR' | 'USD',
        amount: editingIncome.amount.toString() || '',
        frequency: editingIncome.frequency || 'monthly',
        date: editingIncome.date || new Date().toISOString().split('T')[0],
      });
      setExchangeRate(editingIncome.exchangeRate);
    } else {
      form.reset({
        source: '',
        currency: 'MYR',
        amount: '',
        frequency: 'monthly',
        date: new Date().toISOString().split('T')[0],
      });
      setExchangeRate(undefined);
    }
  }, [editingIncome, form]);

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

  const onSubmit = (values: IncomeFormValues) => {
    const incomeData: Omit<Income, 'id'> = {
      source: values.source.trim(),
      amount: parseFloat(values.amount),
      currency: values.currency,
      exchangeRate: values.currency === 'USD' ? exchangeRate : undefined,
      frequency: values.frequency,
      date: values.date,
    };

    if (editingIncome) {
      updateIncome(editingIncome.id, incomeData);
      onCancel?.();
    } else {
      addIncome(incomeData);
      form.reset({
        source: '',
        currency: 'MYR',
        amount: '',
        frequency: 'monthly',
        date: new Date().toISOString().split('T')[0],
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="source" render={({ field }) => (
              <FormItem>
                <FormLabel title="Enter the source of your income (e.g., Salary, Freelance, Investment)">
                  Income Source
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Salary" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="currency" render={({ field }) => (
              <FormItem>
                <FormLabel title="Select the currency for this income">
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
                <FormLabel title="Enter the income amount based on the frequency selected">
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

            <FormField control={form.control} name="frequency" render={({ field }) => (
              <FormItem>
                <FormLabel title="Select how often you receive this income">
                  Frequency
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {INCOME_FREQUENCIES.map(freq => (
                      <SelectItem key={freq.value} value={freq.value}>{freq.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="date" render={({ field }) => (
              <FormItem>
                <FormLabel title="Select the date when this income was received or starts">
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
                {editingIncome ? 'Update Income' : 'Add Income'}
              </Button>
              {editingIncome && onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
      </form>
    </Form>
  );
};

export default IncomeForm;
