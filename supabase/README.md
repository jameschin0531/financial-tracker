# Supabase Setup Instructions

## Prerequisites
- Create a Supabase project at https://supabase.com

## Database Setup

### 1. Run the migration
Copy the contents of `migrations/20250103_initial_schema.sql` and run it in the Supabase SQL Editor:
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Paste the migration SQL
5. Click **Run**

This will create:
- `profiles` table for user profile data
- `financial_data` table for user financial records (JSONB)
- Row Level Security (RLS) policies for both tables
- Automatic `updated_at` trigger for financial_data

### 2. Enable OAuth Providers

#### Google OAuth
1. Go to **Authentication** → **Providers** in Supabase dashboard
2. Enable **Google** provider
3. Follow Supabase instructions to:
   - Create Google OAuth credentials at https://console.cloud.google.com/
   - Add authorized redirect URIs: `https://<your-project>.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret to Supabase

#### GitHub OAuth
1. Go to **Authentication** → **Providers** in Supabase dashboard
2. Enable **GitHub** provider
3. Follow Supabase instructions to:
   - Create GitHub OAuth App at https://github.com/settings/developers
   - Set Authorization callback URL: `https://<your-project>.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret to Supabase

### 3. Configure Redirect URLs
In **Authentication** → **URL Configuration**:
- **Site URL**: Set to your production domain (e.g., `https://your-app.vercel.app`)
- **Redirect URLs**: Add both:
  - `http://localhost:3000` (for local development)
  - `https://your-app.vercel.app` (for production)

### 4. Get Your Credentials
You'll need these for your `.env` file:
- **Project URL**: Found in Settings → API → Project URL
- **Anon/Public Key**: Found in Settings → API → Project API keys → `anon` `public`

## Environment Variables

### Local Development (`.env`)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
ALPHA_VANTAGE_API_KEY=your-api-key
COINGECKO_API_KEY=your-api-key (optional)
EXCHANGE_RATE_API_KEY=your-api-key (optional)
```

### Vercel Production
Add these as environment variables in your Vercel project settings:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `ALPHA_VANTAGE_API_KEY`
- `COINGECKO_API_KEY` (optional)
- `EXCHANGE_RATE_API_KEY` (optional)

## Testing RLS Policies

You can test the RLS policies in the Supabase SQL Editor:

```sql
-- This should only return the current user's data
SELECT * FROM profiles WHERE id = auth.uid();
SELECT * FROM financial_data WHERE user_id = auth.uid();
```

## Schema Overview

### profiles
Stores user profile information synchronized from auth.users.
- `id`: UUID (primary key, references auth.users)
- `email`: User's email
- `full_name`: Display name
- `avatar_url`: Profile picture URL
- `created_at`: Account creation timestamp

### financial_data
Stores all financial data as JSONB for flexibility.
- `user_id`: UUID (primary key, references auth.users)
- `data`: JSONB containing all financial records
- `updated_at`: Auto-updated on every change

The JSONB structure matches the existing `FinancialData` TypeScript type.

