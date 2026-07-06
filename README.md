# Welcome to your Lovable project

## Backend environment setup

Your backend requires these environment variables in `backend/.env`:

```env

```

> `JWT_SECRET` is required for the login JWT token. If it is missing, login will fail with a server error.

## Local development

- Copy `backend/.env.example` to `backend/.env` and fill in the required values.
- Start the backend from the backend folder:

```bash
cd backend
node server.js
```

- Start the frontend from the project root:

```bash
npm run dev
```

## Deployment notes

- For production, set the same variables in your hosting provider's environment variable settings.
