import type { FinancialData } from '../types/financial';
import { getSupabase, isSupabaseInitialized } from './supabaseClient';

export const migrateDataFormat = (data: any): FinancialData => {
  const defaultAssetCategories = ['Cash', 'Savings Account', 'Checking Account', 'Investment', 'Retirement Account', 'Real Estate', 'Vehicle', 'Other'];
  const defaultLiabilityCategories = ['Credit Card', 'Personal Loan', 'Mortgage', 'Auto Loan', 'Student Loan', 'Medical Debt', 'Other'];
  const defaultExpenseCategories = ['Housing', 'Food', 'Transportation', 'Utilities', 'Healthcare', 'Entertainment', 'Shopping', 'Education', 'Insurance', 'Other'];
  
  // Ensure categories exist
  if (!data.assetCategories) {
    data.assetCategories = defaultAssetCategories;
  }
  if (!data.liabilityCategories) {
    data.liabilityCategories = defaultLiabilityCategories;
  }
  if (!data.expenseCategories) {
    data.expenseCategories = defaultExpenseCategories;
  }
  
  // Migrate assets without assetType (default to 'current')
  if (data.assets && Array.isArray(data.assets)) {
    data.assets = data.assets.map((asset: any) => ({
      ...asset,
      assetType: asset.assetType || 'current',
      currency: asset.currency || 'MYR',
    }));
  }
  
  // Migrate liabilities, income, expenses without currency
  if (data.liabilities && Array.isArray(data.liabilities)) {
    data.liabilities = data.liabilities.map((liability: any) => ({
      ...liability,
      currency: liability.currency || 'MYR',
    }));
  }
  
  if (data.income && Array.isArray(data.income)) {
    data.income = data.income.map((income: any) => ({
      ...income,
      currency: income.currency || 'MYR',
    }));
  }
  
  if (data.expenses && Array.isArray(data.expenses)) {
    data.expenses = data.expenses.map((expense: any) => ({
      ...expense,
      currency: expense.currency || 'MYR',
    }));
  }
  
  // Ensure stock-related arrays exist
  if (!data.stockHoldings) {
    data.stockHoldings = [];
  }
  if (!data.cryptoHoldings) {
    data.cryptoHoldings = [];
  }
  if (!data.tradingAccounts) {
    data.tradingAccounts = [];
  }
  if (!data.cryptoAccounts) {
    data.cryptoAccounts = [];
  }
  if (!data.deposits) {
    data.deposits = [];
  }
  
  return data as FinancialData;
};

const getDefaultData = (): FinancialData => ({
  assets: [],
  liabilities: [],
  income: [],
  expenses: [],
  assetCategories: ['Cash', 'Savings Account', 'Checking Account', 'Investment', 'Retirement Account', 'Real Estate', 'Vehicle', 'Other'],
  liabilityCategories: ['Credit Card', 'Personal Loan', 'Mortgage', 'Auto Loan', 'Student Loan', 'Medical Debt', 'Other'],
  expenseCategories: ['Housing', 'Food', 'Transportation', 'Utilities', 'Healthcare', 'Entertainment', 'Shopping', 'Education', 'Insurance', 'Other'],
  stockHoldings: [],
  cryptoHoldings: [],
  tradingAccounts: [],
  cryptoAccounts: [],
  deposits: [],
});

export const loadFinancialData = async (userId: string): Promise<FinancialData> => {
  try {
    if (!isSupabaseInitialized()) {
      throw new Error('Supabase not initialized');
    }

    const supabase = getSupabase();
    
    console.log('Loading financial data for user:', userId);
    
    const { data, error } = await supabase
      .from('financial_data')
      .select('data')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No data found, return defaults
        console.log('No financial data found, returning defaults');
        return getDefaultData();
      }
      throw error;
    }

    if (data && data.data) {
      const migrated = migrateDataFormat(data.data);
      console.log('Financial data loaded successfully');
      return migrated;
    }

    return getDefaultData();
  } catch (error) {
    console.error('Error loading financial data:', error);
    return getDefaultData();
  }
};

export const saveFinancialData = async (userId: string, data: FinancialData): Promise<void> => {
  try {
    if (!isSupabaseInitialized()) {
      throw new Error('Supabase not initialized');
    }

    const supabase = getSupabase();
    
    console.log('Saving financial data for user:', userId);
    
    const { error } = await supabase
      .from('financial_data')
      .upsert({
        user_id: userId,
        data: data,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      throw error;
    }

    console.log('Financial data saved successfully');
  } catch (error) {
    console.error('Error saving financial data:', error);
    throw error;
  }
};
