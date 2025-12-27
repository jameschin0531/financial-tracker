# Financial Tracker

A user-friendly financial web application that allows you to track and manage your financial records without requiring a login. The application features a responsive design, a comprehensive dashboard with key financial metrics, and the ability to switch between dark and light themes.

## Features

- **Financial Record Management**: Track assets, liabilities, income, and expenses
- **Dashboard**: View key financial metrics including net worth, cash flow, and asset allocation
- **Data Visualization**: Interactive charts showing net worth over time, monthly cash flow, and asset allocation
- **Local Storage**: All data is stored locally in your browser - no login required
- **Export Functionality**: Export your financial data as CSV or PDF
- **Theme Switching**: Toggle between dark and light themes
- **Responsive Design**: Works seamlessly on desktops, tablets, and smartphones

## Installation

### Prerequisites

- [Bun](https://bun.sh) (v1.3.5 or later)
- Node.js (if not using Bun)

### Setup

1. Clone or download this repository
2. Install dependencies:

```bash
bun install
```

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

### Adding Financial Records

#### Assets
1. Scroll to the "Add Financial Records" section
2. Fill out the Asset form:
   - **Asset Name**: Enter a descriptive name (e.g., "Savings Account", "Car")
   - **Category**: Select from predefined categories (Cash, Savings Account, Investment, Real Estate, etc.)
   - **Value**: Enter the current value in dollars
   - **Date**: Select the date when this value was recorded
3. Click "Add Asset"

#### Liabilities
1. Use the Liability form to track debts:
   - **Liability Name**: Enter a name (e.g., "Credit Card", "Mortgage")
   - **Category**: Select the type of liability
   - **Amount Owed**: Enter the total amount you owe
   - **Interest Rate**: Optionally enter the annual interest rate as a percentage
   - **Date**: Select when this liability was recorded
2. Click "Add Liability"

#### Income
1. Use the Income form to track income sources:
   - **Income Source**: Enter the source (e.g., "Salary", "Freelance")
   - **Amount**: Enter the income amount
   - **Frequency**: Select how often you receive this income (Weekly, Bi-weekly, Monthly, Yearly, or One-time)
   - **Date**: Select when this income starts or was received
2. Click "Add Income"

#### Expenses
1. Use the Expense form to track spending:
   - **Category**: Select the expense category (Housing, Food, Transportation, etc.)
   - **Amount**: Enter the amount spent
   - **Date**: Select when the expense occurred
   - **Description**: Optionally add a note or description
2. Click "Add Expense"

### Viewing Your Dashboard

The dashboard displays:
- **Total Assets**: Sum of all your assets
- **Total Liabilities**: Sum of all your debts
- **Net Worth**: Assets minus liabilities
- **Monthly Income**: Calculated from all income sources based on their frequency
- **Monthly Expenses**: Sum of expenses for the current month
- **Cash Flow**: Monthly income minus monthly expenses

### Charts

The dashboard includes three interactive charts:

1. **Net Worth Over Time**: A line chart showing how your net worth changes over time
2. **Monthly Cash Flow**: A bar chart comparing monthly income vs expenses
3. **Asset Allocation**: A pie chart showing the distribution of your assets by category

### Exporting Data

1. Click the "Export" button in the header
2. Choose your preferred format:
   - **CSV**: Export all financial data as a comma-separated values file
   - **PDF**: Generate a comprehensive PDF report with all your financial data

### Theme Switching

Click the theme toggle button (🌙/☀️) in the header to switch between dark and light themes. Your preference is automatically saved.

## Data Storage

All financial data is stored locally in your browser's localStorage. This means:
- Your data never leaves your device
- No account or login is required
- Data persists across browser sessions
- Data is specific to the browser you're using

**Important**: If you clear your browser's localStorage or use a different browser, your data will not be available. Consider exporting your data regularly as a backup.

## FAQ

### How do I delete a record?

Currently, the application focuses on adding records. To remove data, you can:
1. Clear your browser's localStorage (this will remove all data)
2. Export your data, edit it externally, and re-import (requires manual process)

### Can I edit existing records?

The current version focuses on adding new records. Future versions may include edit and delete functionality.

### How is monthly income calculated?

Income is converted to monthly amounts based on frequency:
- Weekly: Amount × 4.33
- Bi-weekly: Amount × 2.17
- Monthly: Amount (no conversion)
- Yearly: Amount ÷ 12
- One-time: Not included in monthly calculations

### Why don't I see charts?

Charts require data to display:
- Net Worth chart needs assets or liabilities
- Cash Flow chart needs income or expenses
- Asset Allocation chart needs at least one asset

### Can I use this on mobile?

Yes! The application is fully responsive and works on smartphones, tablets, and desktops.

### Is my data secure?

Yes. All data is stored locally in your browser. It never leaves your device and is not transmitted to any server.

### Can I backup my data?

Yes! Use the Export feature to download your data as CSV or PDF. You can keep these files as backups.

## Troubleshooting

### Charts not displaying

- Ensure you have data entered (assets, liabilities, income, or expenses)
- Check your browser console for any errors
- Try refreshing the page

### Data not persisting

- Check that localStorage is enabled in your browser
- Ensure you're not using private/incognito mode (which may clear data)
- Verify that cookies/localStorage are not blocked

### Export not working

- For CSV: Check that your browser allows downloads
- For PDF: Ensure html2canvas can access the page (some browser extensions may interfere)
- Try a different browser if issues persist

### Theme not switching

- Clear your browser cache and localStorage
- Check browser console for errors
- Ensure JavaScript is enabled

### Application not loading

- Verify all dependencies are installed: `bun install`
- Check that you're running the development server: `bun run dev`
- Ensure your browser supports modern JavaScript features
- Check the browser console for error messages

## Technical Details

### Built With

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Recharts**: Data visualization
- **jsPDF**: PDF generation
- **html2canvas**: Chart capture for PDF
- **CSS Modules**: Component styling
- **Bun**: Runtime and bundler

### Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

This is a personal financial tracking application. If you'd like to contribute improvements, please ensure:
- Code follows TypeScript best practices
- Components use CSS Modules for styling
- New features maintain the no-login, local-storage approach
- Responsive design is maintained

## License

This project is provided as-is for personal use.

## Support

For issues or questions:
1. Check the FAQ section above
2. Review the troubleshooting guide
3. Check browser console for error messages
4. Ensure all dependencies are properly installed

---

**Note**: This application stores data locally in your browser. Always export your data regularly as a backup, especially before clearing browser data or switching devices.
