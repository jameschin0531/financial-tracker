# Deployment Guide

This guide covers deploying the Financial Tracker application to Vercel with Supabase backend.

## Prerequisites

1. **Supabase Project**: Create a project at [supabase.com](https://supabase.com)
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **OAuth Providers**: Configure Google and/or GitHub OAuth apps

## Step 1: Set Up Supabase

### 1.1 Create Database Tables

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the migration script from `supabase/migrations/20250103_initial_schema.sql`

This creates:
- `profiles` table for user profiles
- `financial_data` table for financial records
- Row Level Security (RLS) policies
- Automatic timestamp triggers

### 1.2 Configure OAuth Providers

#### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Set application type to **Web application**
6. Add authorized redirect URIs:
   - `https://<your-project-ref>.supabase.co/auth/v1/callback`
   - `http://localhost:3000` (for local development)
7. Copy **Client ID** and **Client Secret**
8. In Supabase dashboard:
   - Go to **Authentication** → **Providers**
   - Enable **Google**
   - Paste Client ID and Client Secret
   - Save

#### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in application details:
   - **Application name**: Financial Tracker
   - **Homepage URL**: `https://your-app.vercel.app`
   - **Authorization callback URL**: `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. Click **Register application**
5. Copy **Client ID** and generate **Client Secret**
6. In Supabase dashboard:
   - Go to **Authentication** → **Providers**
   - Enable **GitHub**
   - Paste Client ID and Client Secret
   - Save

### 1.3 Configure Redirect URLs

In Supabase dashboard, go to **Authentication** → **URL Configuration**:

1. **Site URL**: Set to your production domain
   - Example: `https://your-app.vercel.app`

2. **Redirect URLs**: Add all allowed redirect URLs (one per line):
   ```
   http://localhost:3000
   https://your-app.vercel.app
   https://your-app-*.vercel.app
   ```

### 1.4 Get API Credentials

From **Settings** → **API**:
- Copy **Project URL** (e.g., `https://xxxxx.supabase.co`)
- Copy **anon public** key from **Project API keys**

## Step 2: Deploy to Vercel

### 2.1 Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New...** → **Project**
3. Import your Git repository (GitHub, GitLab, or Bitbucket)
4. Select the repository containing your Financial Tracker code

### 2.2 Configure Build Settings

Vercel should auto-detect the settings, but verify:

- **Framework Preset**: Other
- **Build Command**: `bun install && bun run build`
- **Output Directory**: `dist`
- **Install Command**: `bun install`

### 2.3 Add Environment Variables

In the Vercel project settings, add these environment variables:

**Required:**
- `SUPABASE_URL` = Your Supabase project URL
- `SUPABASE_ANON_KEY` = Your Supabase anon/public key

**Optional (but recommended):**
- `ALPHA_VANTAGE_API_KEY` = Your Alpha Vantage API key
- `COINGECKO_API_KEY` = Your CoinGecko API key (optional)
- `EXCHANGE_RATE_API_KEY` = Your Exchange Rate API key (optional)

### 2.4 Deploy

1. Click **Deploy**
2. Wait for the build to complete
3. Vercel will provide a deployment URL (e.g., `https://your-app.vercel.app`)

### 2.5 Update Supabase Redirect URLs

After deployment:
1. Copy your Vercel deployment URL
2. Go back to Supabase dashboard → **Authentication** → **URL Configuration**
3. Update **Site URL** to your Vercel URL
4. Ensure your Vercel URL is in the **Redirect URLs** list

## Step 3: Verify Deployment

### Test Authentication
1. Visit your deployed app
2. Click **Continue with Google** or **Continue with GitHub**
3. Complete OAuth flow
4. Verify you're redirected back to the app and logged in

### Test Data Persistence
1. Add some financial data (assets, liabilities, etc.)
2. Refresh the page
3. Verify data persists
4. Sign out and sign back in
5. Verify data is still there

### Test API Keys
1. Navigate to Stock Tracker or Crypto Tracker
2. Add a holding
3. Verify prices are fetched correctly

## Local Development Setup

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd ai-test
```

### 2. Install Dependencies
```bash
bun install
```

### 3. Create `.env` File
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

Edit `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
ALPHA_VANTAGE_API_KEY=your-api-key
```

### 4. Run Development Server
```bash
bun run dev
```

The app will be available at `http://localhost:3000`

## Troubleshooting

### OAuth Redirect Loop
- **Cause**: Redirect URLs not configured correctly in Supabase
- **Fix**: Ensure your deployment URL is in Supabase **Redirect URLs** list

### "Supabase not initialized" Error
- **Cause**: Environment variables not set correctly
- **Fix**: Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Vercel environment variables

### Data Not Persisting
- **Cause**: RLS policies not set up correctly
- **Fix**: Re-run the migration script in Supabase SQL Editor

### Stock/Crypto Prices Not Loading
- **Cause**: API key not configured or rate limit exceeded
- **Fix**: 
  - Verify `ALPHA_VANTAGE_API_KEY` is set in Vercel
  - Check API rate limits
  - App will fallback to Yahoo Finance if Alpha Vantage fails

### Build Fails on Vercel
- **Cause**: Missing dependencies or build configuration
- **Fix**:
  - Ensure `bun` is available (Vercel supports it)
  - Check build logs for specific errors
  - Verify `package.json` has all dependencies

## Architecture Overview

### Frontend (Vercel)
- Static React app built with Bun
- Deployed to Vercel's CDN
- SPA routing handled by `vercel.json` rewrites

### API (Vercel Serverless Functions)
- `/api/config` - Returns environment variables (Supabase credentials, API keys)
- Runs as serverless functions on Vercel

### Backend (Supabase)
- PostgreSQL database with RLS
- Authentication (OAuth providers)
- Real-time subscriptions (not currently used)

### Data Flow
```
User → Vercel (Frontend) → /api/config → Get Credentials
                         ↓
                    Initialize Supabase Client
                         ↓
                    OAuth Login (Google/GitHub)
                         ↓
                    Supabase Auth → Create Session
                         ↓
                    Load Financial Data (RLS protected)
                         ↓
                    User Edits Data
                         ↓
                    Auto-save (debounced) → Supabase DB
```

## Security Notes

1. **API Keys**: Never commit API keys to Git. Use environment variables.
2. **RLS Policies**: Ensure Row Level Security is enabled on all tables.
3. **Anon Key**: The Supabase anon key is safe to expose (it's public).
4. **Service Role Key**: NEVER expose the service role key in frontend code.

## Monitoring

### Vercel Analytics
- Enable in Vercel dashboard → **Analytics**
- Monitor page views, performance, and errors

### Supabase Logs
- View in Supabase dashboard → **Logs**
- Monitor database queries, auth events, and errors

## Updating the App

### Deploy Updates
1. Push changes to your Git repository
2. Vercel automatically deploys on push (if auto-deploy is enabled)
3. Or manually trigger deployment in Vercel dashboard

### Database Migrations
1. Create new migration files in `supabase/migrations/`
2. Run in Supabase SQL Editor
3. Or use Supabase CLI for automated migrations

## Cost Considerations

### Supabase Free Tier
- 500 MB database space
- 2 GB bandwidth
- 50,000 monthly active users
- Unlimited API requests

### Vercel Free Tier
- 100 GB bandwidth
- Unlimited deployments
- Serverless function executions included

### API Costs
- **Alpha Vantage**: Free tier (5 calls/min, 500/day)
- **CoinGecko**: Free tier (10-50 calls/min)
- **Exchange Rate API**: Free tier varies

## Support

For issues:
1. Check Vercel deployment logs
2. Check Supabase logs
3. Review browser console for errors
4. Verify environment variables are set correctly

