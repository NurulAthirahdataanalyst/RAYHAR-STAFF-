# Welcome to your Lovable project

## Backend environment setup

Your backend requires these environment variables in `backend/.env`:

```env

```

> `JWT_SECRET` is required for the login JWT token. If it is missing, login will fail with a server error.

## Deployment notes

- For local development, copy `backend/.env.example` to `backend/.env`.
- For production, set the same variables in your hosting provider's environment variable settings.
