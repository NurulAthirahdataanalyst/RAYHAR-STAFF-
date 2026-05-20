# Welcome to your Lovable project

## Backend environment setup

Your backend requires these environment variables in `backend/.env`:

```env
DATABASE_URL=postgresql://postgres.lhgfzerdekwxppzjngyg:625231040236%40Nyn@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres
JWT_SECRET=r9K$7yZ!b3pQx2sD8vL0nW%hJ4mG6uT1
PORT=5000

VITE_SUPABASE_URL=https://lhgfzerdekwxppzjngyg.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_6qxV-af_juQNObGZoIH6ZA_pXVtVPkc
```

> `JWT_SECRET` is required for the login JWT token. If it is missing, login will fail with a server error.

## Deployment notes

- For local development, copy `backend/.env.example` to `backend/.env`.
- For production, set the same variables in your hosting provider's environment variable settings.
