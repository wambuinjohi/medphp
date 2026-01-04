# PostgreSQL to MySQL Migration Guide

Complete step-by-step guide to migrate from Supabase/PostgreSQL to MySQL while maintaining data integrity and functionality.

## Prerequisites

- MySQL 8.0+ server running and accessible
- Database credentials ready
- Access to your Supabase PostgreSQL database
- Node.js 16+ for running migration scripts
- MySQL client tools (mysql-cli or similar)

## Phase 1: Preparation

### Step 1.1: Create MySQL Database

```bash
# Connect to MySQL server
mysql -h localhost -u root -p

# Create database
CREATE DATABASE app_database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SHOW DATABASES;
```

### Step 1.2: Verify Schema Compatibility

Both PostgreSQL and MySQL schemas are defined:
- **PostgreSQL**: `supabase/migrations/20250201000000_combined_complete_schema.sql`
- **MySQL**: `database/mysql/schema.sql`

Review `DATABASE_CONFIG.md` for schema comparison.

### Step 1.3: Set Up Environment Variables

Add to `.env.local`:

```env
# Current: Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Target: MySQL
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=app_database
MYSQL_PORT=3306
```

## Phase 2: Schema Migration

### Step 2.1: Create MySQL Tables

```bash
# Apply MySQL schema
mysql -h localhost -u root -p app_database < database/mysql/schema.sql

# Verify tables were created
mysql -h localhost -u root -p app_database -e "SHOW TABLES;"
```

You should see tables like:
- companies
- profiles
- customers
- suppliers
- products
- invoices
- quotations
- And 20+ more...

### Step 2.2: Verify Table Structure

```bash
# Check specific table
mysql -h localhost -u root -p app_database -e "DESCRIBE companies;"
```

Verify all columns match the schema.

## Phase 3: Data Migration

### Step 3.1: Export PostgreSQL Data

Create a migration script `scripts/export-postgresql-data.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

const tables = [
  'companies',
  'profiles',
  'customers',
  'suppliers',
  'products',
  'product_categories',
  'tax_settings',
  'quotations',
  'quotation_items',
  'invoices',
  'invoice_items',
  'proforma_invoices',
  'proforma_items',
  'delivery_notes',
  'delivery_note_items',
  'payments',
  'payment_allocations',
  'remittance_advice',
  'remittance_advice_items',
  'stock_movements',
  'lpos',
  'lpo_items',
  'audit_logs',
  'user_permissions',
  'user_invitations',
  'web_categories',
  'web_variants',
];

async function exportData() {
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*');

      if (error) {
        console.error(`Error exporting ${table}:`, error);
        continue;
      }

      // Save to JSON file
      const fs = await import('fs').then(m => m.promises);
      await fs.writeFile(
        `migration-data/${table}.json`,
        JSON.stringify(data, null, 2)
      );

      console.log(`✅ Exported ${table}: ${data?.length || 0} records`);
    } catch (error) {
      console.error(`Failed to export ${table}:`, error);
    }
  }
}

exportData();
```

Run the export:

```bash
mkdir -p migration-data
npx ts-node scripts/export-postgresql-data.ts
```

### Step 3.2: Import Data to MySQL

Create import script `scripts/import-mysql-data.ts`:

```typescript
import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import path from 'path';

const pool = await mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});

const tables = [
  'companies',
  'profiles',
  'customers',
  // ... all tables in correct order (respect foreign keys)
];

async function importData() {
  for (const table of tables) {
    try {
      const filePath = path.join('migration-data', `${table}.json`);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const records = JSON.parse(fileContent);

      if (records.length === 0) {
        console.log(`⚠️  Skipping ${table}: no records`);
        continue;
      }

      // Build insert statement
      const fields = Object.keys(records[0]);
      const placeholders = fields.map(() => '?').join(', ');
      const sql = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;

      const connection = await pool.getConnection();
      
      for (const record of records) {
        const values = fields.map(field => record[field]);
        await connection.execute(sql, values);
      }

      connection.release();
      console.log(`✅ Imported ${table}: ${records.length} records`);
    } catch (error) {
      console.error(`Failed to import ${table}:`, error);
    }
  }

  await pool.end();
}

importData();
```

Run the import:

```bash
npx ts-node scripts/import-mysql-data.ts
```

### Step 3.3: Verify Data Import

```bash
# Check record counts
mysql -h localhost -u root -p app_database -e "
SELECT 'companies' as table_name, COUNT(*) as record_count FROM companies
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices;
"
```

Compare with PostgreSQL counts to ensure all data was migrated.

## Phase 4: Data Integrity Checks

### Step 4.1: Verify Foreign Keys

```sql
-- Check for orphaned records (foreign key violations)
SELECT * FROM customers WHERE company_id NOT IN (SELECT id FROM companies);
SELECT * FROM profiles WHERE company_id NOT IN (SELECT id FROM companies);
SELECT * FROM invoices WHERE customer_id NOT IN (SELECT id FROM customers);
```

If any orphaned records exist, either delete them or fix the foreign keys.

### Step 4.2: Verify Unique Constraints

```sql
-- Check for duplicate emails in profiles
SELECT email, COUNT(*) as count FROM profiles GROUP BY email HAVING count > 1;

-- Check for duplicate customer numbers
SELECT company_id, customer_number, COUNT(*) as count 
FROM customers 
GROUP BY company_id, customer_number 
HAVING count > 1;
```

### Step 4.3: Check Date/Time Fields

```sql
-- Verify timestamp columns have correct values
SELECT COUNT(*) as null_created_at FROM companies WHERE created_at IS NULL;
SELECT COUNT(*) as future_dates FROM invoices WHERE invoice_date > NOW();
```

## Phase 5: Application Configuration

### Step 5.1: Update Environment Variables

Switch to MySQL provider:

```env
VITE_DATABASE_PROVIDER=mysql

# MySQL credentials
MYSQL_HOST=your-mysql-host
MYSQL_USER=your-user
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=app_database
```

### Step 5.2: Test Database Connection

Create test script `scripts/test-mysql-connection.ts`:

```typescript
import { initializePool, healthCheck } from '@/server/db/mysql/connection';

async function testConnection() {
  try {
    await initializePool({
      host: process.env.MYSQL_HOST!,
      user: process.env.MYSQL_USER!,
      password: process.env.MYSQL_PASSWORD!,
      database: process.env.MYSQL_DATABASE!,
    });

    const healthy = await healthCheck();
    console.log(healthy ? '✅ Connection successful' : '❌ Connection failed');
  } catch (error) {
    console.error('❌ Connection error:', error);
  }
}

testConnection();
```

## Phase 6: Testing

### Step 6.1: Unit Tests

Run existing tests:

```bash
npm run test
```

All tests should pass with MySQL provider.

### Step 6.2: Manual Testing Checklist

- [ ] Login with existing user credentials
- [ ] Create new company
- [ ] Add customer to company
- [ ] Create invoice
- [ ] Make payment against invoice
- [ ] Create quotation
- [ ] Create delivery note
- [ ] Manage products and inventory
- [ ] Check audit logs
- [ ] Verify role-based access control

### Step 6.3: Performance Testing

Compare query performance:

```bash
# Log query execution times
MYSQL_LOG_SLOW_QUERIES=1 npm run dev

# Check slow query log
tail -f /var/log/mysql/slow-query.log
```

## Phase 7: Rollback Plan

If issues occur, you can quickly rollback:

### Option 1: Immediate Rollback

```env
VITE_DATABASE_PROVIDER=supabase
```

Data in Supabase remains unchanged.

### Option 2: Full Rollback

1. Keep both databases in sync during migration period
2. Test all features with MySQL
3. After 1-2 weeks of successful operation, delete PostgreSQL database

## Phase 8: Post-Migration

### Step 8.1: Cleanup

```bash
# Delete migration data files
rm -rf migration-data/

# Remove temporary migration scripts
rm -f scripts/export-postgresql-data.ts
rm -f scripts/import-mysql-data.ts
```

### Step 8.2: Documentation

Update these files to reflect MySQL as primary database:
- `DATABASE_CONFIG.md`
- `README.md`
- Deployment guides

### Step 8.3: Monitor Performance

Track metrics:
- Query response times
- Error rates
- Database connection pool usage
- Disk space usage

## Troubleshooting

### Issue: Foreign Key Constraint Violations

**Solution**: Temporarily disable foreign key checks during import:

```sql
SET FOREIGN_KEY_CHECKS=0;
-- Run imports
SET FOREIGN_KEY_CHECKS=1;
```

### Issue: Duplicate Key Violations

**Solution**: Check for duplicate data and either:
1. Update duplicate records to have unique values
2. Delete duplicate records
3. Modify unique constraints

### Issue: Character Encoding Problems

Ensure all tables use `utf8mb4` collation:

```sql
ALTER TABLE table_name CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Issue: Timestamp Column Errors

MySQL and PostgreSQL handle timestamps differently. Ensure:

```sql
-- PostgreSQL TIMESTAMP -> MySQL DATETIME
ALTER TABLE table_name MODIFY COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
```

### Issue: ENUM Type Differences

PostgreSQL ENUMs migrate differently:

```sql
-- PostgreSQL ENUM -> MySQL ENUM
ALTER TABLE profiles MODIFY COLUMN role ENUM('admin', 'accountant', 'stock_manager', 'user', 'super_admin');
```

## Performance Optimization After Migration

### Step 1: Add Indexes

All necessary indexes are created in `database/mysql/schema.sql`. Verify they exist:

```sql
SHOW INDEXES FROM companies;
```

### Step 2: Analyze Query Plans

```sql
EXPLAIN SELECT * FROM invoices WHERE company_id = 'xxx' AND status = 'paid';
```

Ensure indexes are being used (Type should not be "ALL").

### Step 3: Optimize Connection Pooling

In `src/server/db/mysql/connection.ts`:

```typescript
const pool = mysql.createPool({
  connectionLimit: 10,  // Increase if needed
  queueLimit: 0,
  enableKeepAlive: true,
});
```

### Step 4: Enable Query Caching

For read-heavy operations, consider MySQL query cache or Redis:

```typescript
// Add caching layer
import redis from 'redis';

const cacheClient = redis.createClient();
```

## Success Criteria

Migration is successful when:

✅ All tables created with correct structure
✅ All data imported without errors
✅ Foreign key integrity verified
✅ No duplicate or orphaned records
✅ Application connects and loads data
✅ All CRUD operations work
✅ Authentication works correctly
✅ Role-based access control enforced
✅ Audit logs tracked correctly
✅ Performance meets or exceeds Supabase baseline
✅ No errors in application logs

## Support

For migration issues:

1. Check `DATABASE_CONFIG.md` for configuration help
2. Review `MYSQL_IMPLEMENTATION_GUIDE.md` for technical details
3. Check application logs: `npm run dev 2>&1 | tee migration.log`
4. Verify MySQL error log: `tail -f /var/log/mysql/error.log`
5. Test individual components with `scripts/test-mysql-connection.ts`

## Timeline

Typical migration timeline:

- **Phase 1 (Preparation)**: 2 hours
- **Phase 2 (Schema)**: 30 minutes
- **Phase 3 (Data)**: 1-4 hours (depends on data volume)
- **Phase 4 (Integrity)**: 1 hour
- **Phase 5 (Config)**: 1 hour
- **Phase 6 (Testing)**: 4-8 hours
- **Total**: 9-16 hours

Plan migration during low-traffic periods or after hours.

## Rollback Timeline

If needed, rollback to Supabase:

```env
VITE_DATABASE_PROVIDER=supabase
```

Takes effect immediately on next application restart.
