import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFinancialData } from '../../context/FinancialDataContext';
import type { TradingAccount } from '../../types/financial';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

const tradingAccountFormSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  initialMYR: z.string().min(1, 'Initial MYR is required').refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Initial MYR must be 0 or greater'),
  initialUSD: z.string().min(1, 'Initial USD is required').refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Initial USD must be 0 or greater'),
});

type TradingAccountFormValues = z.infer<typeof tradingAccountFormSchema>;

interface TradingAccountFormProps {
  account?: TradingAccount;
  onCancel: () => void;
}

const TradingAccountForm: React.FC<TradingAccountFormProps> = ({ account, onCancel }) => {
  const { addTradingAccount, updateTradingAccount } = useFinancialData();

  const form = useForm<TradingAccountFormValues>({
    resolver: zodResolver(tradingAccountFormSchema),
    defaultValues: {
      name: account?.name || '',
      initialMYR: account?.initialMYR.toString() || '',
      initialUSD: account?.initialUSD.toString() || '',
    },
  });

  const onSubmit = async (values: TradingAccountFormValues) => {
    const accountData: Omit<TradingAccount, 'id'> = {
      name: values.name.trim(),
      initialMYR: parseFloat(values.initialMYR),
      initialUSD: parseFloat(values.initialUSD),
    };

    if (account) {
      updateTradingAccount(account.id, accountData);
      onCancel();
    } else {
      addTradingAccount(accountData);
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
                <FormLabel title="Enter the account name (e.g., etoro, tiger, futu, webull)">
                  Account Name
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g., etoro" {...field} />
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

export default TradingAccountForm;
