# Welcome to your Lovable project

## Backend environment setup

Your backend requires these environment variables in `backend/.env`:

```env
DB_HOST=your_database_host
DB_PORT=your_database_port
DB_USER=your_database_username
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
JWT_SECRET=your_super_secret_key
PORT=5000
```

> `JWT_SECRET` is required for the login JWT token. If it is missing, login will fail with a server error.

## Deployment notes

- For local development, copy `backend/.env.example` to `backend/.env`.
- For production, set the same variables in your hosting provider's environment variable settings.
