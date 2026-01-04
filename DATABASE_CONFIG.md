# Database Configuration Guide

This guide explains how to configure and use the dual database support (Supabase and MySQL) in this application.

## Environment Variables

Add the following environment variables to your `.env.local` file:

### Database Provider Selection

```env
# Select which database provider to use: 'supabase' or 'mysql'
# Default: 'supabase'
VITE_DATABASE_PROVIDER=supabase
```

### Supabase Configuration (if using Supabase)

```env
# Supabase project URL
VITE_SUPABASE_URL=https://your-project.supabase.co

# Supabase public/anon key
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### MySQL Configuration (if using MySQL)

For client-side MySQL access, you would typically use a backend API instead of direct connections. However, if you're using the Node.js server-side MySQL integration:

```env
# MySQL Database Connection (server-side only)
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=app_database
MYSQL_PORT=3306
```

## Switching Between Databases

### Option 1: Environment Variable

Set `VITE_DATABASE_PROVIDER` to switch between providers:

```bash
# Use Supabase
VITE_DATABASE_PROVIDER=supabase npm run dev

# Use MySQL
VITE_DATABASE_PROVIDER=mysql npm run dev
```

### Option 2: Runtime Configuration

In your app initialization (e.g., `main.tsx`):

```typescript
import { initializeDatabase } from '@/integrations/database';

// Switch to MySQL
await initializeDatabase({ provider: 'mysql' });

// Or switch to Supabase
await initializeDatabase({ provider: 'supabase' });
```

## Using the Database in Your Code

### Basic Usage with getDatabase()

```typescript
import { getDatabase } from '@/integrations/database';

const db = getDatabase();

// Select all records
const result = await db.select('customers', { status: 'active' });
console.log(result.data); // Array of customers

// Select one record
const customer = await db.selectOne('customers', customerId);
console.log(customer.data); // Single customer

// Insert a record
const insert = await db.insert('customers', {
  name: 'John Doe',
  email: 'john@example.com',
  company_id: 'company-123',
});
console.log(insert.id); // New record ID

// Update a record
const update = await db.update('customers', customerId, {
  name: 'Jane Doe',
});

// Delete a record
await db.delete('customers', customerId);
```

### React Components with useDatabase Hook

```typescript
import { useDatabase, useSelect, useInsert, useUpdate, useDelete } from '@/hooks/useDatabase';

function CustomersComponent() {
  // Get database instance and provider info
  const { db, provider, isHealthy } = useDatabase();

  // Fetch data
  const { data: customers, isLoading, error } = useSelect('customers', { 
    company_id: companyId 
  });

  // Mutations
  const { insert } = useInsert('customers');
  const { update } = useUpdate('customers');
  const { delete: deleteCustomer } = useDelete('customers');

  const handleAddCustomer = async (customerData) => {
    try {
      const result = await insert(customerData);
      console.log('Created customer:', result.id);
    } catch (error) {
      console.error('Failed to create customer:', error);
    }
  };

  return (
    <div>
      <p>Connected to: {provider}</p>
      <p>Database: {isHealthy ? '✅ Healthy' : '❌ Unhealthy'}</p>
      
      {isLoading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      
      {customers?.map(customer => (
        <div key={customer.id}>
          <h3>{customer.name}</h3>
          <p>{customer.email}</p>
        </div>
      ))}
    </div>
  );
}
```

## Database Schema

Both Supabase and MySQL use the same schema with these main tables:

- `companies` - Multi-company support
- `profiles` - User accounts and roles
- `customers` - Customer information
- `suppliers` - Supplier information
- `products` - Product/inventory
- `invoices` - Invoice documents
- `quotations` - Quotation documents
- `proforma_invoices` - Proforma invoices
- `delivery_notes` - Delivery notes
- `payments` - Payment records
- `lpos` - Local Purchase Orders
- `tax_settings` - Tax configuration
- `web_categories` - Web store categories
- `web_variants` - Web store variants
- `audit_logs` - Audit trail
- And more...

See `supabase/migrations/` for PostgreSQL schema and `database/mysql/schema.sql` for MySQL schema.

## Authorization and Row-Level Security

### Supabase (PostgreSQL RLS)

Supabase uses PostgreSQL Row-Level Security (RLS) policies. These are automatically enforced at the database level:

- Users can only see data from their company
- Admins can manage users and permissions
- Super admins can access all companies

### MySQL

MySQL uses application-level authorization since it doesn't support RLS natively. The `@/server/db/mysql/authorization.ts` module provides:

- `canRead()` - Check if user can read a record
- `canWrite()` - Check if user can modify a record
- `canDelete()` - Check if user can delete a record
- `addCompanyFilter()` - Apply company isolation to queries

Always pass the `AuthContext` to authorization checks:

```typescript
const auth = await db.getAuthContext(userId);
const canRead = await db.canRead('invoices', invoiceId, auth);

if (!canRead) {
  throw new Error('Access denied');
}
```

## Migration from PostgreSQL to MySQL

1. **Export PostgreSQL schema**: Use `database/mysql/schema.sql` as the MySQL equivalent
2. **Create MySQL database**: Run `database/mysql/schema.sql` on your MySQL server
3. **Migrate data**: Use export/import tools or data migration scripts
4. **Test both providers**: Verify functionality works with both databases
5. **Switch provider**: Update `VITE_DATABASE_PROVIDER` to `mysql`

## Health Checks

Check database connectivity:

```typescript
import { databaseManager } from '@/integrations/database';

const health = await databaseManager.healthCheck();
console.log(`Database ${health.provider} is ${health.healthy ? '✅ healthy' : '❌ unhealthy'}`);
```

## Troubleshooting

### "Database not initialized" Error

Initialize the database on app startup:

```typescript
import { initializeDatabase } from '@/integrations/database';

// In your main.tsx or App.tsx
initializeDatabase().catch(console.error);
```

### "Supabase not configured" Error

Ensure environment variables are set:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### MySQL Connection Refused

Make sure:
1. MySQL server is running
2. Database credentials in `.env` are correct
3. Network access is allowed (firewall rules)
4. Database `app_database` exists

### Queries not returning results

Check authorization:
1. Verify user has correct role (admin, accountant, etc.)
2. Verify user belongs to the correct company
3. Check company_id filter is applied

## Performance Optimization

### Connection Pooling

MySQL uses connection pooling for better performance:

```typescript
// Default pool settings in src/server/db/mysql/connection.ts
const pool = mysql.createPool({
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  // ...
});
```

### Query Optimization

For large datasets, use pagination:

```typescript
// Client-side pagination (Supabase)
const page = 1;
const limit = 20;
const from = (page - 1) * limit;

const { data, count } = await supabase
  .from('customers')
  .select('*', { count: 'exact' })
  .range(from, from + limit - 1);
```

## Advanced: Custom Adapters

To create a custom database adapter:

```typescript
import type { IDatabase } from '@/integrations/database';

class CustomAdapter implements IDatabase {
  async select<T>(table, filter) {
    // Your implementation
  }
  
  // ... implement other methods
}

// Register it
import { databaseManager } from '@/integrations/database';
const customAdapter = new CustomAdapter();
databaseManager.useAdapter(customAdapter);
```

## Support

For issues or questions about the database abstraction layer:

1. Check the documentation in `src/integrations/database/`
2. Review example usage in components
3. Check `MYSQL_IMPLEMENTATION_GUIDE.md` for MySQL-specific details
4. Review `POSTGRESQL_TO_MYSQL_MIGRATION.md` for migration guidance
