import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFinancialData } from '../../context/FinancialDataContext';
import type { Asset, Currency } from '../../types/financial';
import { getUSDToMYRRate } from '../../services/exchangeRateService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const assetFormSchema = z.object({
  name: z.string().min(1, 'Asset name is required'),
  assetType: z.enum(['current', 'fixed']),
  category: z.string().min(1, 'Category is required'),
  currency: z.enum(['MYR', 'USD']),
  value: z.string().min(1, 'Value is required').refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Value must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

interface AssetFormProps {
  editingAsset?: Asset;
  onCancel?: () => void;
}

const AssetForm: React.FC<AssetFormProps> = ({ editingAsset, onCancel }) => {
  const { data, addAsset, updateAsset, addAssetCategory } = useFinancialData();
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [exchangeRate, setExchangeRate] = useState<number | undefined>(editingAsset?.exchangeRate);
  const [loadingRate, setLoadingRate] = useState(false);

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: editingAsset?.name || '',
      assetType: editingAsset?.assetType || 'current',
      category: editingAsset?.category || data.assetCategories[0] || '',
      currency: (editingAsset?.currency ?? 'MYR') as 'MYR' | 'USD',
      value: editingAsset?.value.toString() || '',
      date: editingAsset?.date || new Date().toISOString().split('T')[0],
    },
  });

  const watchedCurrency = form.watch('currency');

  useEffect(() => {
    if (editingAsset) {
      form.reset({
        name: editingAsset.name || '',
        assetType: editingAsset.assetType || 'current',
        category: editingAsset.category || data.assetCategories[0] || '',
        currency: (editingAsset.currency ?? 'MYR') as 'MYR' | 'USD',
        value: editingAsset.value.toString() || '',
        date: editingAsset.date ?? new Date().toISOString().split('T')[0],
      });
      setExchangeRate(editingAsset.exchangeRate);
      setShowNewCategory(false);
      setNewCategory('');
    } else {
      form.reset({
        name: '',
        assetType: 'current',
        category: data.assetCategories[0] || '',
        currency: 'MYR',
        value: '',
        date: new Date().toISOString().split('T')[0],
      });
      setExchangeRate(undefined);
      setShowNewCategory(false);
      setNewCategory('');
    }
  }, [editingAsset, data.assetCategories, form]);

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

  const onSubmit = (values: AssetFormValues) => {
    if (showNewCategory && !newCategory.trim()) {
      return;
    }

    const finalCategory = showNewCategory && newCategory.trim() ? newCategory.trim() : values.category;

    if (showNewCategory && newCategory.trim() && !data.assetCategories.includes(newCategory.trim())) {
      addAssetCategory(newCategory.trim());
    }

    const assetData: Omit<Asset, 'id'> = {
      name: values.name.trim(),
      category: finalCategory,
      assetType: values.assetType,
      value: parseFloat(values.value),
      currency: values.currency,
      exchangeRate: values.currency === 'USD' ? exchangeRate : undefined,
      date: values.date,
    };

    if (editingAsset) {
      updateAsset(editingAsset.id, assetData);
      onCancel?.();
    } else {
      addAsset(assetData);
      form.reset({
        name: '',
        assetType: 'current',
        category: showNewCategory && newCategory.trim() ? newCategory.trim() : data.assetCategories[0] || '',
        currency: 'MYR',
        value: '',
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
                <FormLabel title="Enter the name of your asset (e.g., Savings Account, Car, House)">
                  Asset Name
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Savings Account" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="assetType" render={({ field }) => (
              <FormItem>
                <FormLabel title="Current assets are liquid (cash, accounts). Fixed assets are long-term (property, vehicles)">
                  Asset Type
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="current">Current Asset</SelectItem>
                    <SelectItem value="fixed">Fixed Asset</SelectItem>
                  </SelectContent>
                </Select>
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
                      {data.assetCategories.map(cat => (
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
                          form.setValue('category', data.assetCategories[0] || '');
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
                <FormLabel title="Select the currency for this asset">
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

            <FormField control={form.control} name="value" render={({ field }) => (
              <FormItem>
                <FormLabel title="Enter the current value of the asset">
                  Value ({watchedCurrency === 'MYR' ? 'MYR' : 'USD'})
                </FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="date" render={({ field }) => (
              <FormItem>
                <FormLabel title="Select the date when this asset value was recorded">
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
                {editingAsset ? 'Update Asset' : 'Add Asset'}
              </Button>
              {editingAsset && onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
      </form>
    </Form>
  );
};

export default AssetForm;
