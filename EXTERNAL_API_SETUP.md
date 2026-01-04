# External API Integration Guide

## Overview

This document explains how the application has been configured to use an external MySQL API (`med.wayrus.co.ke/api.php`) instead of Supabase as the backend.

## Architecture

### Database Abstraction Layer

The application uses a sophisticated database abstraction layer that supports multiple providers:

```
src/integrations/database/
├── types.ts                    # Interface definitions
├── manager.ts                  # Database manager (singleton)
├── supabase-adapter.ts        # Supabase implementation
├── mysql-adapter.ts           # MySQL implementation
├── external-api-adapter.ts    # External API implementation
├── auth-adapter.ts            # Authentication implementations
├── auth-manager.ts            # Auth manager
└── index.ts                   # Exports
```

### Database Provider Selection

The active database provider is selected via the `VITE_DATABASE_PROVIDER` environment variable:

- **`supabase`** (default) - Uses Supabase PostgreSQL backend
- **`mysql`** - Uses direct MySQL connection (server-side)
- **`external-api`** - Uses REST API for all database operations

## Configuration

### Environment Variables

Set in `.env.local`:

```env
# Database Provider Configuration
VITE_DATABASE_PROVIDER=external-api

# External API Configuration
VITE_EXTERNAL_API_URL=https://med.wayrus.co.ke/api.php
```

### Environment Setup

1. Copy `.env.local` to your local environment:
   ```bash
   cp .env.local .env.local
   ```

2. Update the API URL if necessary:
   ```env
   VITE_EXTERNAL_API_URL=https://your-domain.com/api.php
   ```

## API Endpoints

The external API (`api.php`) supports the following actions:

### Authentication

- **Login**: `POST /?action=login`
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
  Returns: `{ token, user: { id, email, role } }`

- **Check Auth**: `POST /?action=check_auth`
  ```json
  {
    "token": "jwt_token"
  }
  ```
  Returns: `{ id, email, role }`

- **Logout**: `POST /?action=logout`

### CRUD Operations

- **Read**: `POST /?action=read&table=<table_name>`
  ```json
  {
    "where": { "id": "123" }
  }
  ```

- **Create**: `POST /?action=create&table=<table_name>`
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com"
  }
  ```

- **Update**: `PUT /?action=update&table=<table_name>`
  ```json
  {
    "id": "123",
    "name": "Jane Doe"
  }
  ```

- **Delete**: `DELETE /?action=delete&table=<table_name>`
  ```json
  {
    "id": "123"
  }
  ```

## API Features

### Authentication

The API uses JWT tokens for stateless authentication:

1. User logs in via `login` action
2. API returns a JWT token
3. Token is stored in `localStorage` under key `med_api_token`
4. Token is sent in `Authorization: Bearer <token>` header for authenticated requests

### Database Operations

- All CRUD operations go through the REST API
- Parameters are sent as JSON in request body or URL query parameters
- Responses follow standard format: `{ status, data, message, error }`

### CORS Support

The API includes CORS headers:
- `Access-Control-Allow-Origin`: *
- `Access-Control-Allow-Methods`: GET, POST, PUT, DELETE, OPTIONS
- `Access-Control-Allow-Headers`: Content-Type, Accept, Authorization
- `Access-Control-Allow-Credentials`: true

## Implementation Details

### ExternalAPIAdapter

Location: `src/integrations/database/external-api-adapter.ts`

Key methods:
- `login(email, password)` - Authenticate user
- `select(table, filter)` - Fetch records
- `selectOne(table, id)` - Fetch single record
- `insert(table, data)` - Create record
- `update(table, id, data)` - Update record
- `delete(table, id)` - Delete record
- `raw(sql, params)` - Execute raw SQL

### Database Manager

The `DatabaseManager` (singleton) handles provider initialization:

```typescript
import { initializeDatabase, getDatabase } from '@/integrations/database';

// Initialize on app startup
await initializeDatabase();

// Get the active database instance
const db = getDatabase();

// Use it in components
const { data, error } = await db.select('users');
```

## Migration from Supabase

### Direct Supabase References

Some components still directly reference Supabase:
- `src/integrations/supabase/client.ts` - Creates Supabase client
- Components using `supabase` directly for auth, storage, etc.

To fully migrate:

1. Replace direct `supabase` imports with database manager
2. Update auth flows to use `authManager` instead of `supabase.auth`
3. Handle file uploads differently (no Supabase Storage)

### Key Files Needing Updates

```
src/integrations/supabase/         # Direct Supabase usage
src/contexts/AuthContext.tsx        # Uses supabase.auth
src/hooks/useDatabase.ts           # Database hooks
src/hooks/useCreditNotes.ts        # Credit note operations
src/hooks/useQuotationItems.ts     # Quotation operations
```

## Database Schema

The MySQL database should have the following tables. See `public/api.php` for the schema definition.

Required tables:
- `users` - User authentication
- `contacts` - Contact management
- `newsletter` - Newsletter subscriptions
- `leads` - Sales leads
- `quotations` - Quotations
- `portfolios` - Portfolio items
- And others as needed by the application

## API Reference Implementation

The reference API implementation is in `public/api.php`:

```php
// Database Configuration
$db_host = $_ENV['DB_HOST'] ?? 'localhost';
$db_user = $_ENV['DB_USER'] ?? 'root';
$db_pass = $_ENV['DB_PASS'] ?? 'password';
$db_name = $_ENV['DB_NAME'] ?? 'app_db';

// Connection
$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
```

### Setting Up Your Own API Server

1. Deploy `public/api.php` to your server
2. Set environment variables on the server:
   ```bash
   DB_HOST=your-mysql-host
   DB_USER=your-mysql-user
   DB_PASS=your-mysql-password
   DB_NAME=your-database-name
   JWT_SECRET=your-secret-key
   ```
3. Ensure PHP has:
   - MySQLi extension
   - JSON support
   - OpenSSL (for JWT)

## Testing

### Health Check

```bash
curl https://med.wayrus.co.ke/api.php?action=health
```

Response:
```json
{
  "status": "success",
  "message": "API is healthy"
}
```

### Login Test

```bash
curl -X POST https://med.wayrus.co.ke/api.php?action=login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

### Create Record Test

```bash
curl -X POST 'https://med.wayrus.co.ke/api.php' \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "action": "create",
    "table": "contacts",
    "data": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "123456789"
    }
  }'
```

## Troubleshooting

### "API not authenticated" Error

1. Check token is being saved in localStorage
2. Verify token is being sent in Authorization header
3. Check token hasn't expired (24 hour expiry by default)
4. Verify user has correct role and permissions

### "Database connection failed" Error

1. Check `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME` environment variables
2. Verify MySQL server is running and accessible
3. Check network connectivity to database server
4. Verify user has appropriate database permissions

### CORS Issues

1. Ensure API has CORS headers configured
2. Check browser console for CORS error details
3. Verify `Access-Control-Allow-Origin` header matches your domain
4. Test with `curl` to verify API works directly

## Performance Considerations

### Advantages
- Stateless (no session management needed)
- Flexible deployment (can use any web server)
- Database independent (easy to switch MySQL versions)
- Scalable (can implement caching, CDN, etc.)

### Disadvantages
- Network latency for each database operation
- Limited transaction support (single operation per API call)
- No real-time subscriptions (would need WebSocket or polling)
- File storage requires alternative solution (not built-in)

## File Uploads

The external API does not include file upload support. For file handling:

1. Use a separate file upload service (AWS S3, Google Cloud Storage, etc.)
2. Store file URLs in database
3. Implement file upload API endpoint separately

## Security Considerations

1. **JWT Tokens**
   - Change `JWT_SECRET` in production
   - Implement token refresh mechanism
   - Add token expiration validation

2. **Input Validation**
   - API uses basic SQL escaping
   - Implement stronger validation in production
   - Use prepared statements if migrating to modern PHP

3. **CORS**
   - Update `$origin` to restrict to your domain
   - Don't allow wildcard in production
   - Implement proper CORS policy

4. **Rate Limiting**
   - Consider adding rate limiting
   - Implement API key authentication
   - Add request throttling

## Support

For issues or questions:
1. Check this documentation
2. Review API logs on server
3. Test API endpoints with curl
4. Check browser developer console for errors
5. Verify environment variables are set correctly

