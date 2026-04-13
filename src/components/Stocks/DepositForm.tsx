import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFinancialData } from '../../context/FinancialDataContext';
import type { Deposit } from '../../types/financial';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const depositFormSchema = z.object({
  account: z.string().min(1, 'Account is required'),
  date: z.string().min(1, 'Date is required'),
  amount: z.string().min(1, 'Amount is required').refine(v => !isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Amount must be greater than 0'),
  usd: z.string().optional().or(z.literal('')),
  sgd: z.string().optional().or(z.literal('')),
  aud: z.string().optional().or(z.literal('')),
});

type DepositFormValues = z.infer<typeof depositFormSchema>;

interface DepositFormProps {
  deposit?: Deposit;
  onCancel: () => void;
  accounts: string[];
}

const DepositForm: React.FC<DepositFormProps> = ({ deposit, onCancel, accounts }) => {
  const { addDeposit, updateDeposit } = useFinancialData();

  const form = useForm<DepositFormValues>({
    resolver: zodResolver(depositFormSchema),
    defaultValues: {
      account: deposit?.account || accounts[0] || '',
      date: deposit?.date || new Date().toISOString().split('T')[0],
      amount: deposit?.amount.toString() || '',
      usd: deposit?.usd?.toString() || '',
      sgd: deposit?.sgd?.toString() || '',
      aud: deposit?.aud?.toString() || '',
    },
  });

  const onSubmit = (values: DepositFormValues) => {
    const depositData: Omit<Deposit, 'id'> = {
      account: values.account,
      date: values.date,
      amount: parseFloat(values.amount),
      usd: values.usd ? parseFloat(values.usd) : undefined,
      sgd: values.sgd ? parseFloat(values.sgd) : undefined,
      aud: values.aud ? parseFloat(values.aud) : undefined,
    };

    if (deposit) {
      updateDeposit(deposit.id, depositData);
      onCancel();
    } else {
      addDeposit(depositData);
      form.reset({
        account: accounts[0] || '',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        usd: '',
        sgd: '',
        aud: '',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="account" render={({ field }) => (
                <FormItem>
                  <FormLabel>Account</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map(acc => (
                        <SelectItem key={acc} value={acc}>{acc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem>
                <FormLabel title="Enter the deposit amount in Malaysian Ringgit">
                  Amount (MYR)
                </FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField control={form.control} name="usd" render={({ field }) => (
                <FormItem>
                  <FormLabel>USD (Optional)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="sgd" render={({ field }) => (
                <FormItem>
                  <FormLabel>SGD (Optional)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="aud" render={({ field }) => (
                <FormItem>
                  <FormLabel>AUD (Optional)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit">
                {deposit ? 'Update Deposit' : 'Add Deposit'}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
      </form>
    </Form>
  );
};

export default DepositForm;
