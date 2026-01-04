#!/usr/bin/env node

/**
 * Admin CLI Script: Reset Password
 * 
 * Usage:
 * npx ts-node scripts/admin/reset-password.ts \
 *   --email user@example.com \
 *   --user-id <uuid> \
 *   --admin-id <admin-uuid> \
 *   --redirect-url "https://yourapp.com/reset" (optional)
 * 
 * Or with environment variables:
 * SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 * npm run admin:reset-password
 */

import { adminResetPassword } from '../../src/server/lib/adminResetPassword';

interface CliArgs {
  email: string;
  userId: string;
  adminId: string;
  redirectUrl?: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: any = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '').replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    const value = args[i + 1];
    parsed[key] = value;
  }

  if (!parsed.email || !parsed.userId || !parsed.adminId) {
    console.error('Missing required arguments:');
    console.error('  --email <email>');
    console.error('  --user-id <uuid>');
    console.error('  --admin-id <admin-uuid>');
    console.error('\nOptional arguments:');
    console.error('  --redirect-url <url>');
    process.exit(1);
  }

  return {
    email: parsed.email,
    userId: parsed.userId,
    adminId: parsed.adminId,
    redirectUrl: parsed.redirectUrl
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

  console.log('\n🔐 Sending password reset email...\n');
  console.log(`Email: ${args.email}`);
  console.log(`User ID: ${args.userId}`);
  console.log(`Admin ID: ${args.adminId}`);
  if (args.redirectUrl) console.log(`Redirect URL: ${args.redirectUrl}`);
  console.log('');

  const result = await adminResetPassword(
    {
      email: args.email,
      user_id: args.userId,
      admin_id: args.adminId,
      redirectUrl: args.redirectUrl
    },
    supabaseUrl,
    supabaseKey
  );

  if (result.success) {
    console.log('✅ Password reset email sent successfully!');
    console.log('The user will receive an email with instructions to reset their password.\n');
  } else {
    console.error('❌ Failed to send password reset email:');
    console.error(`Error: ${result.error}\n`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
