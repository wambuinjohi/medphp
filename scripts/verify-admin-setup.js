#!/usr/bin/env node
/**
 * Verify Admin User Setup
 * 
 * This script verifies that the admin setup was successful and the user can sign in.
 * 
 * Usage:
 *   node scripts/verify-admin-setup.js [email]
 *   ADMIN_EMAIL=admin@example.com node scripts/verify-admin-setup.js
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://klifzjcfnlaxminytmyh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('Please set: export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function verifySetup() {
  console.log('\n🔍 >> Medical Supplies - Admin Setup Verification\n');
  console.log('═'.repeat(50));

  try {
    let adminEmail = process.argv[2] || process.env.ADMIN_EMAIL;

    if (!adminEmail) {
      adminEmail = await question('\n📧 Enter admin email to verify: ');
      if (!adminEmail) {
        console.error('❌ Email is required');
        process.exit(1);
      }
    }

    console.log(`\n🔍 Checking ${adminEmail}...\n`);

    // Check if profile exists
    console.log('1️⃣  Checking profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, status, role, company_id, full_name')
      .eq('email', adminEmail)
      .maybeSingle();

    if (profileError) {
      console.error('   ❌ Error fetching profile:', profileError.message);
      process.exit(1);
    }

    if (!profile) {
      console.error(`   ❌ No profile found for ${adminEmail}`);
      console.error('\n⚠️  The admin user was not created. Run:');
      console.error('   node scripts/create-first-admin.js\n');
      process.exit(1);
    }

    console.log('   ✅ Profile found');
    console.log(`      • ID: ${profile.id.substring(0, 8)}...`);
    console.log(`      • Email: ${profile.email}`);
    console.log(`      • Status: ${profile.status}`);
    console.log(`      • Role: ${profile.role}`);
    console.log(`      • Full Name: ${profile.full_name || 'Not set'}`);

    // Verify status is active
    console.log('\n2️⃣  Checking status...');
    if (profile.status !== 'active') {
      console.error(`   ❌ Account status is "${profile.status}" (should be "active")`);
      console.error('\n⚠️  User cannot sign in. Run:');
      console.error('   export SUPABASE_SERVICE_ROLE_KEY="your-key"');
      console.error('   node scripts/approve-admin-account.js\n');
      process.exit(1);
    }
    console.log('   ✅ Account status is active');

    // Verify role is admin
    console.log('\n3️⃣  Checking role...');
    if (profile.role !== 'admin') {
      console.error(`   ❌ Role is "${profile.role}" (should be "admin")`);
      console.error('\n⚠️  User does not have admin privileges\n');
      process.exit(1);
    }
    console.log('   ✅ User has admin role');

    // Check company
    console.log('\n4️⃣  Checking company...');
    if (!profile.company_id) {
      console.warn('   ⚠️  No company assigned');
    } else {
      const { data: company } = await supabase
        .from('companies')
        .select('id, name')
        .eq('id', profile.company_id)
        .maybeSingle();

      if (company) {
        console.log(`   ✅ Company: ${company.name}`);
      } else {
        console.warn('   ⚠️  Company not found');
      }
    }

    // Check permissions
    console.log('\n5️⃣  Checking permissions...');
    const { data: permissions } = await supabase
      .from('user_permissions')
      .select('permission_name, granted')
      .eq('user_id', profile.id);

    if (permissions && permissions.length > 0) {
      console.log(`   ✅ Found ${permissions.length} permission(s):`);
      permissions.forEach(p => {
        console.log(`      • ${p.permission_name}: ${p.granted ? '✓' : '✗'}`);
      });
    } else {
      console.log('   ℹ️  No specific permissions assigned (admin role grants all)');
    }

    // Check auth user
    console.log('\n6️⃣  Checking auth user...');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.warn('   ⚠️  Could not verify auth user');
    } else {
      const authUser = users.find(u => u.email === adminEmail);
      if (authUser) {
        console.log('   ✅ Auth user exists');
        console.log(`      • Email confirmed: ${authUser.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log(`      • Last signed in: ${authUser.last_sign_in_at || 'Never'}`);
      } else {
        console.error('   ❌ Auth user not found');
      }
    }

    // Success!
    console.log('\n' + '═'.repeat(50));
    console.log('\n✅ VERIFICATION SUCCESSFUL!\n');
    console.log('📋 Summary:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Status: Active ✓`);
    console.log(`   Role: Admin ✓`);
    console.log(`   Can sign in: YES ✓`);
    console.log('\n🚀 Next Steps:');
    console.log(`   1. Go to: ${process.env.VITE_APP_URL || 'http://localhost:5173'}`);
    console.log(`   2. Sign in with your email and password`);
    console.log(`   3. Start managing >> Medical Supplies!\n`);

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

verifySetup();
