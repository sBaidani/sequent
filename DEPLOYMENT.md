# Sequent Deployment Guide

## Production Environment
The application is deployed on Vercel with a Supabase PostgreSQL backend.

### Frontend Deployment (Vercel)
The Vite/Solid.js frontend is automatically deployed to Vercel via the GitHub Integration.
1. Push to `main` branch triggers a new deployment.
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Root Directory: `.`

### Environment Variables
Ensure the following variables are set in your Vercel Project Settings:
- `VITE_SUPABASE_URL`: Your Supabase Project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Public Key

### Database Deployments (Supabase)
To push the database schema or Edge Functions to production:
```bash
# Link to your project
supabase link --project-ref <your-project-ref>

# Push the migrations (Tables, RLS)
supabase db push

# Deploy Edge functions
supabase functions deploy gemini-proxy
supabase functions deploy weather-proxy
```

### Analytics & Telemetry
If using Sentry or Signoz, insert the respective DSN into the Vercel Environment Variables.
