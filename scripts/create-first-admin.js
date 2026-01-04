#!/usr/bin/env node
/**
 * Create First Admin User
 * 
 * This script creates the first admin user in the system.
 * It sets up all required auth and profile data.
 * 
 * Usage: 
 *   node scripts/create-first-admin.js [email] [password] [fullName]
 *   OR set environment variables:
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secure123 ADMIN_FULL_NAME="Admin User" node scripts/create-first-admin.js
 * 
 * Examples:
 *   node scripts/create-first-admin.js admin@medplus.app "SecurePassword123!" "Admin User"
 *   ADMIN_EMAIL=admin@medplus.app ADMIN_PASSWORD=pass123 node scripts/create-first-admin.js
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://klifzjcfnlaxminytmyh.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.error('\nSetup Instructions:');
  console.error('1. Go to your Supabase project settings: https://app.supabase.com/');
  console.error('2. Navigate to "API" section in the left sidebar');
  console.error('3. Copy the "Service Role Key" (NOT the anon key)');
  console.error('4. Set the environment variable:');
  console.error('   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  console.error('5. Run this script again\n');
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

async function validatePassword(password) {
  // Basic password validation
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  return null;
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Invalid email format';
  return null;
}

async function createFirstAdmin() {
  console.log('\n🚀 >> Medical Supplies - First Admin User Setup\n');
  console.log('═'.repeat(50));

  try {
    // Get admin credentials
    let adminEmail = process.argv[2] || process.env.ADMIN_EMAIL;
    let adminPassword = process.argv[3] || process.env.ADMIN_PASSWORD;
    let adminFullName = process.argv[4] || process.env.ADMIN_FULL_NAME || 'Admin User';

    // Prompt for email if not provided
    if (!adminEmail) {
      adminEmail = await question('\n📧 Enter admin email address: ');
      if (!adminEmail) {
        console.error('❌ Email is required');
        process.exit(1);
      }
    }

    // Validate email
    const emailError = validateEmail(adminEmail);
    if (emailError) {
      console.error(`❌ ${emailError}`);
      process.exit(1);
    }

    // Check if user already exists
    console.log(`\n🔍 Checking if ${adminEmail} already exists...`);
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, status, role')
      .eq('email', adminEmail)
      .maybeSingle();

    if (existingProfile) {
      console.log(`\n⚠️  User ${adminEmail} already exists!`);
      console.log(`   Status: ${existingProfile.status || 'pending'}`);
      console.log(`   Role: ${existingProfile.role || 'user'}`);
      
      const update = await question('\n Would you like to update this user to admin status? (yes/no): ');
      if (update.toLowerCase() !== 'yes' && update.toLowerCase() !== 'y') {
        console.log('\n❌ Cancelled');
        process.exit(0);
      }

      // Update existing user
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'admin',
          status: 'active',
          full_name: adminFullName,
          updated_at: new Date().toISOString(),
        })
        .eq('email', adminEmail);

      if (updateError) {
        console.error('❌ Error updating profile:', updateError.message);
        process.exit(1);
      }

      console.log('\n✅ Successfully updated user to admin!');
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Role: admin`);
      console.log(`   Status: active`);
      console.log('\n🎉 User can now sign in with their existing password\n');
      process.exit(0);
    }

    // Prompt for password if not provided
    if (!adminPassword) {
      adminPassword = await question('\n🔐 Enter admin password (min 8 characters): ');
      const passwordError = await validatePassword(adminPassword);
      if (passwordError) {
        console.error(`❌ ${passwordError}`);
        process.exit(1);
      }

      // Confirm password
      const confirmPassword = await question('🔐 Confirm password: ');
      if (adminPassword !== confirmPassword) {
        console.error('❌ Passwords do not match');
        process.exit(1);
      }
    } else {
      const passwordError = await validatePassword(adminPassword);
      if (passwordError) {
        console.error(`❌ ${passwordError}`);
        process.exit(1);
      }
    }

    // Prompt for full name if not provided
    if (!adminFullName || adminFullName === 'Admin User') {
      const fullName = await question('\n👤 Enter full name (optional, press Enter to skip): ');
      if (fullName) adminFullName = fullName;
    }

    console.log('\n🔄 Creating admin user...\n');

    // Check if there's a company to associate with
    console.log('📋 Checking for default company...');
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name')
      .limit(1);

    let companyId = null;
    if (companies && companies.length > 0) {
      companyId = companies[0].id;
      console.log(`   ✅ Found company: ${companies[0].name}`);
    } else {
      console.log('   ℹ️  No company found, creating default company...');
      const { data: newCompany, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: '>> Medical Supplies',
          email: adminEmail,
          currency: 'KES',
        })
        .select('id')
        .single();

      if (companyError) {
        console.error('❌ Error creating company:', companyError.message);
        process.exit(1);
      }

      if (newCompany) {
        companyId = newCompany.id;
        console.log(`   ✅ Created default company: >> Medical Supplies`);
      }
    }

    // Create auth user
    console.log('\n🔐 Creating authentication user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });

    if (authError) {
      console.error('❌ Error creating auth user:', authError.message);
      process.exit(1);
    }

    const userId = authData.user.id;
    console.log(`   ✅ Auth user created (ID: ${userId.substring(0, 8)}...)`);

    // Create profile
    console.log('\n📝 Creating user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: adminEmail,
        full_name: adminFullName,
        role: 'admin',
        status: 'active',
        company_id: companyId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Error creating profile:', profileError.message);
      // Cleanup: delete the auth user if profile creation fails
      try {
        await supabase.auth.admin.deleteUser(userId);
        console.error('   🧹 Cleaned up auth user');
      } catch (cleanup) {
        console.error('   ⚠️  Could not clean up auth user');
      }
      process.exit(1);
    }

    console.log(`   ✅ Profile created`);

    // Assign admin permissions
    console.log('\n🔑 Assigning permissions...');
    const { error: permError } = await supabase
      .from('user_permissions')
      .insert({
        user_id: userId,
        permission_name: 'view_dashboard_summary',
        granted: true,
      });

    if (permError && !permError.message?.includes('duplicate')) {
      console.warn(`   ⚠️  Could not assign view_dashboard_summary permission: ${permError.message}`);
    } else {
      console.log(`   ✅ Assigned view_dashboard_summary permission`);
    }

    // Success!
    console.log('\n' + '═'.repeat(50));
    console.log('\n✅ SUCCESS! First admin user created!\n');
    console.log('📋 Admin Account Details:');
    console.log(`   Email:     ${adminEmail}`);
    console.log(`   Full Name: ${adminFullName}`);
    console.log(`   Role:      admin`);
    console.log(`   Status:    active`);
    console.log(`   Company:   ${companies && companies[0] ? companies[0].name : '>> Medical Supplies'}`);
    console.log('\n🔗 Next Steps:');
    console.log(`   1. Go to: ${process.env.VITE_APP_URL || 'http://localhost:5173'}`);
    console.log(`   2. Sign in with:`);
    console.log(`      Email: ${adminEmail}`);
    console.log(`      Password: (the password you just set)`);
    console.log(`   3. Start managing the system!\n`);

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the setup
createFirstAdmin();
