# Financial Tracker

A comprehensive, user-friendly financial web application that allows you to track and manage your complete financial portfolio without requiring a login. The application features a modern glassmorphism UI design, responsive layout, comprehensive dashboard with key financial metrics, real-time stock and crypto price tracking, and the ability to switch between eye-protective light and dark themes.

**🖥️ Desktop App Available**: This application can also be run as a desktop app! See [README-ELECTRON.md](./README-ELECTRON.md) for details.

## Features

### Core Financial Management
- **Asset Management**: Track current and fixed assets with dynamic categories
- **Liability Tracking**: Monitor debts, loans, and liabilities with interest rates
- **Income Tracking**: Record income sources with multiple frequencies (weekly, bi-weekly, monthly, yearly, one-time)
- **Expense Management**: Track expenses with dynamic categories and descriptions
- **Multi-Currency Support**: Support for MYR (default), USD, and HKD with automatic exchange rate conversion
- **Dynamic Categories**: Add custom categories for assets, liabilities, and expenses

### Investment Tracking
- **Stock Portfolio Tracker**: 
  - Track stock holdings with real-time price updates
  - Group holdings by stock code with expandable rows
  - Filter by account, P&L, and portfolio portion
  - Sort by P&L, value, and portion
  - Multiple trading accounts support
  - Track deposits and initial investments
  - Support for cash holdings
  - Currency support: USD, MYR, HKD
- **Crypto Portfolio Tracker**:
  - Track cryptocurrency holdings with real-time price updates
  - Multiple crypto accounts/wallets
  - Automatic USD to MYR conversion
  - Support for major cryptocurrencies (BTC, ETH, SOL, USDT, WLD, etc.)

### Dashboard & Analytics
- **Financial Overview**: 
  - Current Assets, Fixed Assets, Total Assets
  - Total Liabilities
  - Net Worth calculation
- **Investment Portfolios**:
  - Stock Portfolio value
  - Crypto Portfolio value
- **Cash Flow Summary**:
  - Monthly Income
  - Monthly Expenses
  - Cash Flow (Income - Expenses)
- **Interactive Charts**:
  - Net Worth Over Time (line chart)
  - Asset Allocation (pie chart)
  - Current Asset Allocation (excludes fixed assets)

### Data Management
- **File-Based Storage**: All data is stored in `data/financial-data.json` in the project directory
- **Export Functionality**: Export your financial data as CSV or PDF
- **Edit & Delete**: Full CRUD operations for all financial records
- **Data Persistence**: Automatic saving on every change

### User Interface
- **Modern Glassmorphism Design**: Transparent, frosted glass aesthetic with backdrop blur effects
- **Eye-Protective Light Theme**: Warm, soft colors designed to reduce eye strain
- **Dark Theme**: Near-black dark mode for low-light environments
- **Responsive Design**: Works seamlessly on desktops, tablets, and smartphones
- **Sidebar Navigation**: Easy access to all sections (Dashboard, Assets, Liabilities, Cash Flow, Stock Tracker, Crypto Tracker)

## Installation

### Prerequisites

- [Bun](https://bun.sh) (v1.3.5 or later) - Recommended runtime and bundler
- Node.js (if not using Bun)

### Setup

1. Clone or download this repository
2. Install dependencies:

```bash
bun install
```

3. Configure API keys (optional but recommended):

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
# Alpha Vantage API Key (for stock prices)
# Get your free API key from: https://www.alphavantage.co/support/#api-key
ALPHA_VANTAGE_API_KEY=your_api_key_here

# Optional: CoinGecko API Key (for higher rate limits)
# Get your API key from: https://www.coingecko.com/en/api
# COINGECKO_API_KEY=your_api_key_here

# Optional: Exchange Rate API Key
# EXCHANGE_RATE_API_KEY=your_api_key_here
```

**Note**: The application will work without API keys using free tiers and fallback services, but you may encounter rate limits. Adding your own API keys is recommended for production use.

## Running the Application

### Development Mode

To run the application in development mode with hot reloading:

```bash
bun run dev
```

The application will be available at `http://localhost:3000` (or the port specified by Bun).

### Production Build

To build the application for production:

```bash
bun run build
```

The built files will be in the `dist` directory.

## Usage Guide

### Navigation

The application features a sidebar navigation with the following sections:
- **📊 Dashboard**: Overview of your financial status
- **💰 Assets**: Manage your assets (current and fixed)
- **💳 Liabilities**: Track your debts and loans
- **📈 Monthly Cash Flow**: View income and expenses in a table format
- **📈 Stock Tracker**: Manage your stock portfolio
- **₿ Crypto Tracker**: Manage your cryptocurrency holdings

### Adding Financial Records

#### Assets
1. Navigate to the Assets page
2. Fill out the Asset form:
   - **Asset Name**: Enter a descriptive name (e.g., "Savings Account", "Car")
   - **Asset Type**: Select "Current Asset" (liquid) or "Fixed Asset" (long-term)
   - **Category**: Select from existing categories or add a new one
   - **Value**: Enter the current value
   - **Currency**: Select MYR (default), USD, or HKD
   - **Date**: Select when this value was recorded
3. Click "Add Asset"

**Note**: When USD is selected, the app automatically fetches the current USD-to-MYR exchange rate and converts the value.

#### Liabilities
1. Navigate to the Liabilities page
2. Fill out the Liability form:
   - **Liability Name**: Enter a name (e.g., "Credit Card", "Mortgage")
   - **Category**: Select from existing categories or add a new one
   - **Amount Owed**: Enter the total amount you owe
   - **Currency**: Select MYR (default), USD, or HKD
   - **Interest Rate**: Optionally enter the annual interest rate as a percentage
   - **Date**: Select when this liability was recorded
3. Click "Add Liability"

#### Income
1. Navigate to the Monthly Cash Flow page
2. Use the Income form:
   - **Income Source**: Enter the source (e.g., "Salary", "Freelance")
   - **Amount**: Enter the income amount
   - **Currency**: Select MYR (default) or USD
   - **Frequency**: Select how often you receive this income (Weekly, Bi-weekly, Monthly, Yearly, or One-time)
   - **Date**: Select when this income starts or was received
3. Click "Add Income"

#### Expenses
1. Navigate to the Monthly Cash Flow page
2. Use the Expense form:
   - **Category**: Select from existing categories or add a new one
   - **Amount**: Enter the amount spent
   - **Currency**: Select MYR (default) or USD
   - **Date**: Select when the expense occurred
   - **Description**: Optionally add a note or description
3. Click "Add Expense"

### Stock Tracker

#### Setting Up Trading Accounts
1. Navigate to the Stock Tracker page
2. Click "Add Account" to create a new trading account
3. Enter:
   - **Account Name**: Name of your trading account
   - **Initial Invested (MYR)**: Initial investment amount in MYR
   - **Initial Invested (USD)**: Initial investment amount in USD (optional)
4. Click "Add Account"

#### Adding Stock Holdings
1. Click "Add Holding" in the Stock Tracker page
2. Fill out the form:
   - **Stock Code**: Enter the stock symbol (e.g., "AAPL", "TSLA")
   - **Stock Type**: Select "Stock" or "Cash"
   - **Account**: Select the trading account
   - **Quantity**: Number of shares (auto-set to 1 for cash)
   - **Average Price**: Average purchase price per share
   - **Currency**: Select USD, MYR, or HKD
   - **Date**: Purchase date
3. Click "Add Holding"

**Note**: The app automatically fetches real-time stock prices from Alpha Vantage API (with Yahoo Finance fallback).

#### Features
- **Grouped Holdings**: Holdings with the same stock code are grouped together
- **Expandable Rows**: Click to expand/collapse grouped holdings
- **Filters**: Filter by account, P&L (profit/loss), and portfolio portion
- **Sorting**: Sort by P&L, value, or portion
- **Account Summary**: View account name, current MYR, current USD, initial invested, and P&L

#### Adding Deposits
1. Click "Add Deposit" in the Stock Tracker page
2. Enter:
   - **Account**: Select the trading account
   - **Date**: Deposit date
   - **Amount (MYR)**: Deposit amount in MYR
   - **USD, SGD, AUD**: Optional amounts in other currencies
3. Click "Add Deposit"

### Crypto Tracker

#### Setting Up Crypto Accounts
1. Navigate to the Crypto Tracker page
2. Click "Add Account" to create a new crypto account/wallet
3. Enter:
   - **Account Name**: Name of your crypto account or wallet
4. Click "Add Account"

#### Adding Crypto Holdings
1. Click "Add Holding" in the Crypto Tracker page
2. Fill out the form:
   - **Crypto Symbol**: Enter the crypto symbol (e.g., "BTC", "ETH", "SOL", "USDT", "WLD")
   - **Quantity**: Amount of cryptocurrency
   - **Average Price (USD)**: Average purchase price in USD
   - **Account**: Select the crypto account
   - **Date**: Purchase date
3. Click "Add Holding"

**Note**: The app automatically fetches real-time crypto prices from CoinGecko API. All crypto prices are in USD.

### Editing and Deleting Records

All records (assets, liabilities, income, expenses, stock holdings, crypto holdings, accounts) can be edited or deleted:
1. Find the record in the list
2. Click the "Edit" button to modify the record
3. Click the "Delete" button to remove the record

### Viewing Your Dashboard

The dashboard displays three main sections:

#### Financial Overview
- **Current Assets**: Sum of all current (liquid) assets
- **Fixed Assets**: Sum of all fixed (long-term) assets
- **Total Assets**: Current + Fixed Assets + Stock Portfolio + Crypto Portfolio
- **Total Liabilities**: Sum of all debts
- **Net Worth**: Total Assets minus Total Liabilities

#### Investment Portfolios
- **Stock Portfolio**: Total value of all stock holdings
- **Crypto Portfolio**: Total value of all crypto holdings

#### Cash Flow Summary
- **Monthly Income**: Calculated from all income sources based on their frequency
- **Monthly Expenses**: Sum of expenses for the current month
- **Cash Flow**: Monthly income minus monthly expenses

### Charts

The dashboard includes interactive charts:

1. **Net Worth Over Time**: A line chart showing how your net worth changes over time (includes stock and crypto values)
2. **Asset Allocation**: A pie chart showing the distribution of your assets by category (includes Stock Portfolio and Crypto Portfolio)
3. **Current Asset Allocation**: A pie chart showing only current assets (excludes fixed assets)

### Cash Flow Table

The Monthly Cash Flow page displays a comprehensive table showing:
- All income items with monthly MYR amounts
- All expense items with monthly MYR amounts
- Summary rows for total income, total expenses, and balance
- Edit and delete buttons for each item

### Exporting Data

1. Click the "Export" button in the header
2. Choose your preferred format:
   - **CSV**: Export all financial data as a comma-separated values file
   - **PDF**: Generate a comprehensive PDF report with all your financial data

### Theme Switching

Click the theme toggle button (🌙/☀️) in the header to switch between:
- **Light Theme**: Eye-protective warm colors designed to reduce eye strain
- **Dark Theme**: Near-black dark mode for low-light environments

Your preference is automatically saved.

## Data Storage

All financial data is stored in a local file (`data/financial-data.json`) in the project directory. This means:
- Your data is stored on your local machine
- No account or login is required
- Data persists across browser sessions
- Data is automatically saved on every change

**Important**: 
- The `data/` directory is included in `.gitignore` to keep your financial data private
- Always export your data regularly as a backup
- The data file is stored server-side and accessed via API endpoints (`/api/data`)

## API Integration

The application uses the following free APIs:

- **Exchange Rates**: [exchangerate-api.com](https://www.exchangerate-api.com/) for USD-to-MYR and HKD-to-MYR conversion
- **Stock Prices**: [Alpha Vantage](https://www.alphavantage.co/) with [Yahoo Finance](https://finance.yahoo.com/) fallback
- **Crypto Prices**: [CoinGecko API](https://www.coingecko.com/en/api)

**Note**: API rate limits may apply. Prices are cached to reduce API calls.

## FAQ

### How do I edit or delete a record?

Click the "Edit" or "Delete" button next to any record in the list. All records support full CRUD operations.

### How is monthly income calculated?

Income is converted to monthly amounts based on frequency:
- Weekly: Amount × 4.33
- Bi-weekly: Amount × 2.17
- Monthly: Amount (no conversion)
- Yearly: Amount ÷ 12
- One-time: Not included in monthly calculations

### How are stock prices updated?

Stock prices are fetched automatically from Alpha Vantage API (with Yahoo Finance fallback) when you view the Stock Tracker page. Prices are cached to reduce API calls.

### How are crypto prices updated?

Crypto prices are fetched automatically from CoinGecko API when you view the Crypto Tracker page. Prices are cached to reduce API calls.

### Can I add custom categories?

Yes! When adding assets, liabilities, or expenses, you can select "+ Add New Category" from the category dropdown and enter a new category name. It will be saved and available for future use.

### How does currency conversion work?

- When you select USD or HKD for an asset, liability, income, or expense, the app automatically fetches the current exchange rate
- The exchange rate is stored with the record
- Values are converted to MYR for display and calculations
- Stock holdings support USD, MYR, and HKD currencies
- Crypto prices are always in USD

### Why don't I see charts?

Charts require data to display:
- Net Worth chart needs assets, liabilities, stock holdings, or crypto holdings
- Asset Allocation chart needs at least one asset, stock holding, or crypto holding
- Cash Flow table needs income or expenses

### Can I use this on mobile?

Yes! The application is fully responsive and works on smartphones, tablets, and desktops.

### Is my data secure?

Yes. All data is stored locally in the `data/financial-data.json` file on your machine. It never leaves your device and is not transmitted to any external server (except for API calls to fetch stock/crypto prices and exchange rates).

### Can I backup my data?

Yes! Use the Export feature to download your data as CSV or PDF. You can also manually backup the `data/financial-data.json` file.

### What happens if the API is down?

If stock or crypto price APIs are unavailable, the application will continue to work, but prices may not update. You can still view and manage your holdings with the last known prices.

## Troubleshooting

### Charts not displaying
- Ensure you have data entered (assets, liabilities, income, expenses, stock holdings, or crypto holdings)
- Check your browser console for any errors
- Try refreshing the page

### Data not persisting
- Check that the `data/` directory exists and is writable
- Ensure the server is running (`bun run dev`)
- Check server logs for any file write errors

### Export not working
- For CSV: Check that your browser allows downloads
- For PDF: Ensure html2canvas can access the page (some browser extensions may interfere)
- Try a different browser if issues persist

### Stock/Crypto prices not updating
- Check your internet connection
- Verify API services are available (Alpha Vantage, CoinGecko)
- Check browser console for API errors
- Prices are cached - wait a few minutes and refresh

### Theme not switching
- Clear your browser cache and localStorage
- Check browser console for errors
- Ensure JavaScript is enabled

### Application not loading
- Verify all dependencies are installed: `bun install`
- Check that you're running the development server: `bun run dev`
- Ensure your browser supports modern JavaScript features
- Check the browser console for error messages
- Verify the server is running on the correct port

## Technical Details

### Built With

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Recharts**: Data visualization
- **jsPDF**: PDF generation
- **html2canvas**: Chart capture for PDF
- **CSS Modules**: Component-scoped styling
- **Bun**: Runtime, bundler, and server

### Project Structure

```
ai-test/
├── data/                    # Data storage (gitignored)
│   └── financial-data.json  # Financial data file
├── public/                  # Static files
│   └── index.html          # HTML entry point
├── src/
│   ├── components/         # React components
│   │   ├── Crypto/        # Crypto tracker components
│   │   ├── Dashboard/    # Dashboard components
│   │   ├── Export/        # Export functionality
│   │   ├── Forms/         # Form components
│   │   ├── Layout/        # Layout components
│   │   └── Stocks/        # Stock tracker components
│   ├── context/           # React context providers
│   ├── pages/             # Page components
│   ├── services/          # Business logic and API services
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── server.ts              # Bun server with API endpoints
├── package.json           # Dependencies and scripts
└── tsconfig.json          # TypeScript configuration
```

### API Endpoints

- `GET /api/data`: Fetch financial data from `data/financial-data.json`
- `POST /api/data`: Save financial data to `data/financial-data.json`

### Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

This is a personal financial tracking application. If you'd like to contribute improvements, please ensure:
- Code follows TypeScript best practices
- Components use CSS Modules for styling
- New features maintain the no-login, file-based storage approach
- Responsive design is maintained
- API calls are properly cached to reduce rate limiting

## License

This project is provided as-is for personal use.

## Support

For issues or questions:
1. Check the FAQ section above
2. Review the troubleshooting guide
3. Check browser console for error messages
4. Ensure all dependencies are properly installed
5. Verify the server is running correctly

---

**Note**: This application stores data locally in the `data/financial-data.json` file. Always export your data regularly as a backup, especially before making major changes or switching devices.
