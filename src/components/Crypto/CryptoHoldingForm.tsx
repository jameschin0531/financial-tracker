import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFinancialData } from '../../context/FinancialDataContext';
import type { CryptoHolding } from '../../types/financial';
import { getCryptoPrice } from '../../services/cryptoPriceService';
import { getUSDToMYRRate } from '../../services/exchangeRateService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const cryptoHoldingFormSchema = z.object({
  symbol: z.string().min(1, 'Crypto symbol is required'),
  name: z.string().optional().or(z.literal('')),
  quantity: z.string().min(1, 'Quantity is required').refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Quantity must be greater than 0'),
  avgPrice: z.string().min(1, 'Average price is required').refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Average price must be greater than 0'),
  account: z.string().min(1, 'Account is required'),
});

type CryptoHoldingFormValues = z.infer<typeof cryptoHoldingFormSchema>;

interface CryptoHoldingFormProps {
  holding?: CryptoHolding;
  onCancel: () => void;
  accounts: Array<{ id: string; name: string }>;
}

const CryptoHoldingForm: React.FC<CryptoHoldingFormProps> = ({ holding, onCancel, accounts }) => {
  const { data, addCryptoHolding, updateCryptoHolding } = useFinancialData();
  const [loadingPrice, setLoadingPrice] = useState(false);

  const form = useForm<CryptoHoldingFormValues>({
    resolver: zodResolver(cryptoHoldingFormSchema),
    defaultValues: {
      symbol: holding?.symbol || '',
      name: holding?.name || '',
      quantity: holding?.quantity ? holding.quantity.toString() : '',
      avgPrice: holding?.avgPrice ? holding.avgPrice.toString() : '',
      account: holding?.account || (accounts.length > 0 && accounts[0] ? accounts[0].name : ''),
    },
  });

  const watchedSymbol = form.watch('symbol');

  useEffect(() => {
    if (!holding && accounts.length > 0 && accounts[0]) {
      const currentAccount = form.getValues('account');
      if (!currentAccount) {
        form.setValue('account', accounts[0].name);
      }
    }
  }, [accounts, holding, form]);

  useEffect(() => {
    if (watchedSymbol && watchedSymbol.length >= 2 && !holding) {
      const timer = setTimeout(async () => {
        setLoadingPrice(true);
        try {
          await getCryptoPrice(watchedSymbol);
        } catch {
          // Price fetch is best-effort
        } finally {
          setLoadingPrice(false);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [watchedSymbol, holding]);

  const onSubmit = async (values: CryptoHoldingFormValues) => {
    let marketPrice = holding?.marketPrice;
    let exchangeRate = holding?.exchangeRate;

    if (!marketPrice || !holding) {
      setLoadingPrice(true);
      try {
        const price = await getCryptoPrice(values.symbol.toUpperCase());
        if (price) {
          marketPrice = price;
        }
      } catch {
        // Price fetch is best-effort
      }
      setLoadingPrice(false);
    }

    if (!exchangeRate) {
      exchangeRate = await getUSDToMYRRate();
    }

    const holdingData: Omit<CryptoHolding, 'id'> = {
      symbol: values.symbol.toUpperCase().trim(),
      name: values.name?.trim() || undefined,
      quantity: parseFloat(values.quantity),
      avgPrice: parseFloat(values.avgPrice),
      marketPrice,
      account: values.account,
      currency: 'USD',
      exchangeRate: exchangeRate || 4.7,
      lastUpdated: marketPrice ? new Date().toISOString() : undefined,
    };

    if (holding) {
      updateCryptoHolding(holding.id, holdingData);
      onCancel();
    } else {
      addCryptoHolding(holdingData);
      form.reset({
        symbol: '',
        name: '',
        quantity: '',
        avgPrice: '',
        account: accounts[0]?.name || '',
      });
      onCancel();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="symbol" render={({ field }) => (
                <FormItem>
                  <FormLabel title="Enter the crypto symbol (e.g., BTC, ETH, SOL)">
                    Crypto Symbol
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., BTC"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Crypto Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Bitcoin" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.00000001" min="0" placeholder="0.00000000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="avgPrice" render={({ field }) => (
                <FormItem>
                  <FormLabel>Average Price (USD)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="account" render={({ field }) => (
              <FormItem>
                <FormLabel>Account/Wallet</FormLabel>
                {accounts.length === 0 ? (
                  <p className="text-sm text-destructive">
                    No crypto accounts available. Please add an account first.
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

            {loadingPrice && (
              <p className="text-sm text-muted-foreground">
                Fetching current market price...
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={loadingPrice}
              >
                {holding ? 'Update Holding' : 'Add Holding'}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
            {accounts.length === 0 && (
              <p className="text-sm text-destructive text-center">
                Please add a crypto account first before adding holdings.
              </p>
            )}
      </form>
    </Form>
  );
};

export default CryptoHoldingForm;
