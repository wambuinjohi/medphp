#!/usr/bin/env node

/**
 * Admin CLI Script: Fix Profile RLS
 * 
 * This script generates SQL to fix infinite recursion in profile RLS policies.
 * The SQL can be:
 * 1. Displayed in the console
 * 2. Saved to a file
 * 3. Executed manually in Supabase SQL editor
 * 
 * Usage:
 * npx ts-node scripts/admin/fix-rls.ts [--output file.sql]
 * 
 * Or with environment variables:
 * SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 * npm run admin:fix-rls
 */

import { fixProfileRls } from '../../src/server/lib/fixProfileRls';
import * as fs from 'fs';
import * as path from 'path';

interface CliArgs {
  output?: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: any = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '').replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    const value = args[i + 1];
    parsed[key] = value;
  }

  return {
    output: parsed.output
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

  console.log('\n🔧 Generating RLS fix SQL...\n');

  const result = await fixProfileRls(supabaseUrl, supabaseKey);

  if (result.success) {
    console.log('✅ SQL generated successfully!\n');

    if (result.sql) {
      if (args.output) {
        const outputPath = path.resolve(args.output);
        fs.writeFileSync(outputPath, result.sql, 'utf8');
        console.log(`📝 SQL saved to: ${outputPath}\n`);
        console.log('You can now execute this SQL in your Supabase SQL editor.\n');
      } else {
        console.log('Generated SQL:\n');
        console.log('================================================================================');
        console.log(result.sql);
        console.log('================================================================================\n');
        console.log('Copy the above SQL and execute it in your Supabase SQL editor.\n');
        console.log('Or save it with: npm run admin:fix-rls -- --output fix-rls.sql\n');
      }
    }

    console.log('ℹ️  ' + result.message);
  } else {
    console.error('❌ Failed to generate RLS fix SQL:');
    console.error(`Error: ${result.error}\n`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
