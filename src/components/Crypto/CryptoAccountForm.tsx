import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFinancialData } from '../../context/FinancialDataContext';
import type { CryptoAccount } from '../../types/financial';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

const cryptoAccountFormSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  initialMYR: z.string().min(1, 'Initial MYR is required').refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Initial MYR must be 0 or greater'),
  initialUSD: z.string().min(1, 'Initial USD is required').refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Initial USD must be 0 or greater'),
});

type CryptoAccountFormValues = z.infer<typeof cryptoAccountFormSchema>;

interface CryptoAccountFormProps {
  account?: CryptoAccount;
  onCancel: () => void;
}

const CryptoAccountForm: React.FC<CryptoAccountFormProps> = ({ account, onCancel }) => {
  const { addCryptoAccount, updateCryptoAccount } = useFinancialData();

  const form = useForm<CryptoAccountFormValues>({
    resolver: zodResolver(cryptoAccountFormSchema),
    defaultValues: {
      name: account?.name || '',
      initialMYR: account?.initialMYR.toString() || '',
      initialUSD: account?.initialUSD.toString() || '',
    },
  });

  const onSubmit = async (values: CryptoAccountFormValues) => {
    const accountData: Omit<CryptoAccount, 'id'> = {
      name: values.name.trim(),
      initialMYR: parseFloat(values.initialMYR),
      initialUSD: parseFloat(values.initialUSD),
    };

    if (account) {
      updateCryptoAccount(account.id, accountData);
      onCancel();
    } else {
      addCryptoAccount(accountData);
      form.reset({
        name: '',
        initialMYR: '',
        initialUSD: '',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel title="Enter the account or wallet name (e.g., Binance, Coinbase, MetaMask)">
                  Account/Wallet Name
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Binance" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="initialMYR" render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Investment (MYR)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="initialUSD" render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Investment (USD)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">
                {account ? 'Update Account' : 'Add Account'}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
      </form>
    </Form>
  );
};

export default CryptoAccountForm;
