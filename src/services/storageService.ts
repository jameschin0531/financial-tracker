import type { FinancialData } from '../types/financial';

const API_URL = '/api/data';

const migrateDataFormat = (data: any): FinancialData => {
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

export const loadFinancialData = async (): Promise<FinancialData> => {
  try {
    // Load from file via API (file storage only)
    console.log('Loading data from file:', API_URL);
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      const migrated = migrateDataFormat(data);
      console.log('Data loaded from file successfully');
      return migrated;
    } else {
      console.warn('File not found, returning default structure');
    }
  } catch (error) {
    console.error('Error loading financial data from file:', error);
  }
  
  // Return default data if file doesn't exist or error occurred
  console.log('No data found, returning default structure');
  return {
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
  };
};

export const saveFinancialData = async (data: FinancialData): Promise<void> => {
  try {
    console.log('Saving data to file:', API_URL);
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    console.log('Save response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Save failed with response:', errorText);
      throw new Error(`Failed to save data: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('Data saved to file successfully:', result);
  } catch (error) {
    console.error('Error saving financial data to file:', error);
    throw error; // Re-throw to let caller handle the error
  }
};
