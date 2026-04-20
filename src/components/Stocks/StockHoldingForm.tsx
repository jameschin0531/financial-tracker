import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFinancialData } from '../../context/FinancialDataContext';
import type { StockHolding, Currency, StockType } from '../../types/financial';
import { getStockPrice } from '../../services/stockPriceService';
import { getUSDToMYRRate, getHKDToMYRRate } from '../../services/exchangeRateService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const stockHoldingFormSchema = z.object({
  code: z.string(),
  name: z.string().optional().or(z.literal('')),
  quantity: z.string().optional().or(z.literal('')),
  avgPrice: z.string().min(1, 'Price/amount is required').refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Must be greater than 0'),
  account: z.string().min(1, 'Account is required'),
  stockType: z.enum(['Stock', 'ETF', 'Cash']),
  currency: z.enum(['USD', 'MYR', 'HKD']),
});

type StockHoldingFormValues = z.infer<typeof stockHoldingFormSchema>;

interface StockHoldingFormProps {
  holding?: StockHolding;
  onCancel: () => void;
  accounts: Array<{ id: string; name: string }>;
}

const StockHoldingForm: React.FC<StockHoldingFormProps> = ({ holding, onCancel, accounts }) => {
  const { data, addStockHolding, updateStockHolding } = useFinancialData();
  const [loadingPrice, setLoadingPrice] = useState(false);

  const form = useForm<StockHoldingFormValues>({
    resolver: zodResolver(stockHoldingFormSchema),
    defaultValues: {
      code: holding?.code || '',
      name: holding?.name || '',
      quantity: holding?.quantity ? holding.quantity.toString() : '',
      avgPrice: holding?.avgPrice ? holding.avgPrice.toString() : '',
      account: holding?.account || accounts[0]?.name || '',
      stockType: holding?.stockType || 'Stock',
      currency: holding?.currency || 'USD',
    },
  });

  const watchedCode = form.watch('code');
  const watchedStockType = form.watch('stockType');
  const watchedAccount = form.watch('account');
  const watchedCurrency = form.watch('currency');

  useEffect(() => {
    if (watchedCode && watchedCode.length >= 1 && !holding && watchedStockType !== 'Cash') {
      const timer = setTimeout(async () => {
        setLoadingPrice(true);
        try {
          await getStockPrice(watchedCode);
        } catch {
          // Price fetch is best-effort
        } finally {
          setLoadingPrice(false);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [watchedCode, holding, watchedStockType]);

  useEffect(() => {
    if (watchedStockType === 'Cash' && watchedAccount && !watchedCode && !holding) {
      form.setValue('code', `${watchedAccount} Cash`);
    }
  }, [watchedStockType, watchedAccount, watchedCode, holding, form]);

  const onSubmit = async (values: StockHoldingFormValues) => {
    if (values.stockType !== 'Cash' && !values.code.trim()) {
      form.setError('code', { message: 'Stock code is required' });
      return;
    }

    if (values.stockType !== 'Cash' && (!values.quantity || parseFloat(values.quantity) <= 0)) {
      form.setError('quantity', { message: 'Quantity must be greater than 0' });
      return;
    }

    let marketPrice = holding?.marketPrice;
    let exchangeRate = holding?.exchangeRate;

    if (values.stockType === 'Cash') {
      marketPrice = parseFloat(values.avgPrice);
      if (!values.code.trim()) {
        form.setValue('code', values.account || 'Cash');
      }
    } else if (!marketPrice || !holding) {
      setLoadingPrice(true);
      try {
        const priceUSD = await getStockPrice(values.code.toUpperCase());
        if (priceUSD) {
          marketPrice = priceUSD;
        }
      } catch {
        // Price fetch is best-effort
      }
      setLoadingPrice(false);
    }

    if (values.currency === 'USD' && !exchangeRate) {
      exchangeRate = await getUSDToMYRRate();
    } else if (values.currency === 'HKD' && !exchangeRate) {
      exchangeRate = await getHKDToMYRRate();
    }

    const holdingData: Omit<StockHolding, 'id'> = {
      code: values.stockType === 'Cash' ? (values.code.trim() || `${values.account} Cash`).toUpperCase() : values.code.toUpperCase().trim(),
      name: values.name?.trim() || (values.stockType === 'Cash' ? `${values.account} Cash` : undefined),
      quantity: values.stockType === 'Cash' ? 1 : (values.quantity ? parseFloat(values.quantity) : 1),
      avgPrice: parseFloat(values.avgPrice),
      marketPrice,
      account: values.account,
      stockType: values.stockType,
      currency: values.currency,
      exchangeRate: (values.currency === 'USD' || values.currency === 'HKD') ? exchangeRate : undefined,
      lastUpdated: marketPrice ? new Date().toISOString() : undefined,
    };

    if (holding) {
      updateStockHolding(holding.id, holdingData);
      onCancel();
    } else {
      addStockHolding(holdingData);
      form.reset({
        code: '',
        name: '',
        quantity: '',
        avgPrice: '',
        account: accounts[0]?.name || '',
        stockType: 'Stock',
        currency: 'USD',
      });
      onCancel();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel title={watchedStockType === 'Cash' ? 'Enter a name for this cash holding' : 'Enter the stock ticker symbol (e.g., AAPL, TSLA, TSM)'}>
                    {watchedStockType === 'Cash' ? 'Cash Name' : 'Stock Code (Ticker)'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={watchedStockType === 'Cash' ? 'e.g., Tiger Cash' : 'e.g., AAPL'}
                      disabled={watchedStockType === 'Cash' && !holding}
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                  {watchedStockType === 'Cash' && !watchedCode && (
                    <FormDescription>Will auto-fill with account name</FormDescription>
                  )}
                </FormItem>
              )} />

              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Apple Inc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {watchedStockType !== 'Cash' && (
                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.0001" min="0" placeholder="0.0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <FormField control={form.control} name="avgPrice" render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {watchedStockType === 'Cash' ? 'Cash Amount' : 'Average Price'} ({watchedCurrency})
                  </FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                  {watchedStockType === 'Cash' && (
                    <FormDescription>Enter the total cash amount in this account</FormDescription>
                  )}
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField control={form.control} name="stockType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Stock">Stock</SelectItem>
                      <SelectItem value="ETF">ETF</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="currency" render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="MYR">MYR</SelectItem>
                      <SelectItem value="HKD">HKD</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="account" render={({ field }) => (
                <FormItem>
                  <FormLabel>Account</FormLabel>
                  {accounts.length === 0 ? (
                    <p className="text-sm text-destructive">
                      No trading accounts available. Please add an account first.
                    </p>
                  ) : (
                    <>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.name}>{acc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </>
                  )}
                </FormItem>
              )} />
            </div>

            {loadingPrice && watchedStockType !== 'Cash' && (
              <p className="text-sm text-muted-foreground">
                Fetching current market price...
              </p>
            )}
            {watchedStockType === 'Cash' && (
              <p className="text-sm text-muted-foreground">
                Cash holdings don't require market price updates. The amount you enter will be used as both average and market value.
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={loadingPrice && watchedStockType !== 'Cash'}
              >
                {holding ? 'Update Holding' : 'Add Holding'}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
      </form>
    </Form>
  );
};

export default StockHoldingForm;
