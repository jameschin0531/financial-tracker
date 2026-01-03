# Quick Start Guide

Get your Financial Tracker up and running with Supabase authentication and cloud storage.

## Prerequisites

- [Bun](https://bun.sh) installed
- [Supabase](https://supabase.com) account (free tier is fine)
- [Vercel](https://vercel.com) account (optional, for deployment)

## 1. Install Dependencies

```bash
bun install
```

This installs all required packages including `@supabase/supabase-js`.

## 2. Set Up Supabase

### Create a Project
1. Go to [supabase.com](https://supabase.com)
2. Click **New Project**
3. Fill in project details and wait for setup to complete

### Run Database Migration
1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the contents of `supabase/migrations/20250103_initial_schema.sql`
4. Paste and click **Run**

This creates the `profiles` and `financial_data` tables with Row Level Security.

### Configure OAuth Providers

#### Google OAuth (Recommended)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URI: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
6. Copy Client ID and Client Secret
7. In Supabase: **Authentication** → **Providers** → **Google** → Enable and paste credentials

#### GitHub OAuth (Alternative)
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Set callback URL: `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
4. Copy Client ID and generate Client Secret
5. In Supabase: **Authentication** → **Providers** → **GitHub** → Enable and paste credentials

### Get API Credentials
1. In Supabase dashboard, go to **Settings** → **API**
2. Copy **Project URL** (e.g., `https://xxxxx.supabase.co`)
3. Copy **anon public** key

## 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp env.example .env
```

Edit `.env` and add your credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
ALPHA_VANTAGE_API_KEY=your-api-key  # Optional but recommended
```

## 4. Update Supabase Redirect URLs

In Supabase dashboard:
1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL**: `http://localhost:3000`
3. Add **Redirect URLs**:
   ```
   http://localhost:3000
   https://your-app.vercel.app
   ```

## 5. Run Locally

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 6. Test Authentication

1. Click **Continue with Google** or **Continue with GitHub**
2. Complete OAuth flow
3. You should be redirected back and logged in
4. Try adding some financial data
5. Refresh the page - data should persist

## 7. Deploy to Vercel (Optional)

### Quick Deploy
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click **New Project** and import your repository
4. Add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `ALPHA_VANTAGE_API_KEY` (optional)
5. Click **Deploy**

### Update Supabase URLs
After deployment:
1. Copy your Vercel URL (e.g., `https://your-app.vercel.app`)
2. In Supabase: **Authentication** → **URL Configuration**
3. Update **Site URL** to your Vercel URL
4. Ensure Vercel URL is in **Redirect URLs** list

## Troubleshooting

### "Supabase not initialized" Error
- Check that `.env` file exists and has correct values
- Restart dev server after changing `.env`

### OAuth Redirect Loop
- Verify redirect URLs in Supabase match your app URL exactly
- Check that OAuth provider credentials are correct

### Data Not Saving
- Check browser console for errors
- Verify RLS policies were created (run migration again if needed)
- Check Supabase logs in dashboard

### Build Errors
- Run `bun install` to ensure all dependencies are installed
- Check that `@supabase/supabase-js` is in `package.json`

## Next Steps

- Read `DEPLOYMENT.md` for detailed deployment guide
- Check `IMPLEMENTATION_SUMMARY.md` for architecture details
- Review `supabase/README.md` for database schema info

## Getting Help

- Check the browser console for errors
- Check Supabase logs: Dashboard → **Logs**
- Check Vercel logs: Dashboard → **Deployments** → Select deployment → **Logs**
- Review `DEPLOYMENT.md` troubleshooting section

## API Keys (Optional)

### Alpha Vantage (Stock Prices)
1. Get free API key: [alphavantage.co](https://www.alphavantage.co/support/#api-key)
2. Add to `.env`: `ALPHA_VANTAGE_API_KEY=your-key`
3. Restart dev server

### CoinGecko (Crypto Prices)
- Free tier works without API key
- For higher limits: [coingecko.com/en/api](https://www.coingecko.com/en/api)

## Security Notes

- Never commit `.env` file to Git (it's in `.gitignore`)
- The Supabase anon key is safe to expose (it's public)
- Never expose the Supabase service role key
- API keys are served via serverless function, not exposed in frontend

## What's Different from File-Based Storage?

**Before:**
- Data stored in local `data/financial-data.json` file
- No authentication required
- Data tied to single machine

**Now:**
- Data stored in Supabase cloud database
- OAuth authentication required
- Data accessible from any device
- Automatic cloud sync
- Row Level Security for privacy

Enjoy your secure, cloud-synced Financial Tracker! 🚀

