#!/usr/bin/env node

/**
 * Admin CLI Script: Create User
 * 
 * Usage:
 * npx ts-node scripts/admin/create-user.ts \
 *   --email user@example.com \
 *   --password SecurePass123! \
 *   --role admin \
 *   --company-id <uuid> \
 *   --full-name "John Doe"
 * 
 * Or with environment variables:
 * SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 * npm run admin:create-user
 */

import { adminCreateUser } from '../../src/server/lib/adminCreateUser';

interface CliArgs {
  email: string;
  password: string;
  role: 'admin' | 'accountant' | 'stock_manager' | 'user' | 'super_admin';
  companyId: string;
  fullName?: string;
  phone?: string;
  department?: string;
  position?: string;
  invitedBy?: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: any = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '').replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    const value = args[i + 1];
    parsed[key] = value;
  }

  if (!parsed.email || !parsed.password || !parsed.role || !parsed.companyId) {
    console.error('Missing required arguments:');
    console.error('  --email <email>');
    console.error('  --password <password>');
    console.error('  --role <admin|accountant|stock_manager|user|super_admin>');
    console.error('  --company-id <uuid>');
    console.error('\nOptional arguments:');
    console.error('  --full-name <name>');
    console.error('  --phone <phone>');
    console.error('  --department <department>');
    console.error('  --position <position>');
    console.error('  --invited-by <admin-user-id>');
    process.exit(1);
  }

  return {
    email: parsed.email,
    password: parsed.password,
    role: parsed.role,
    companyId: parsed.companyId,
    fullName: parsed.fullName,
    phone: parsed.phone,
    department: parsed.department,
    position: parsed.position,
    invitedBy: parsed.invitedBy
  };
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing environment variables:');
    console.error('  SUPABASE_URL or VITE_SUPABASE_URL');
    console.error('  SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const args = parseArgs();

  console.log('\n🔐 Creating user...\n');
  console.log(`Email: ${args.email}`);
  console.log(`Role: ${args.role}`);
  console.log(`Company ID: ${args.companyId}`);
  if (args.fullName) console.log(`Full Name: ${args.fullName}`);
  console.log('');

  const result = await adminCreateUser(
    {
      email: args.email,
      password: args.password,
      role: args.role,
      company_id: args.companyId,
      full_name: args.fullName,
      phone: args.phone,
      department: args.department,
      position: args.position,
      invited_by: args.invitedBy
    },
    supabaseUrl,
    supabaseKey
  );

  if (result.success) {
    console.log('✅ User created successfully!');
    console.log(`User ID: ${result.user_id}\n`);
  } else {
    console.error('❌ Failed to create user:');
    console.error(`Error: ${result.error}\n`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
