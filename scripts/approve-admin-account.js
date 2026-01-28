#!/usr/bin/env node
/**
 * Approve Admin Account - External API Version
 *
 * This script approves/activates an admin account via helixgeneralhardware.com/api.php
 * 
 * Usage:
 *   node scripts/approve-admin-account.js [user-id] [approval-code]
 */

const EXTERNAL_API_URL = process.env.VITE_EXTERNAL_API_URL || 'https://helixgeneralhardware.com/api.php';
const AUTH_TOKEN = process.env.API_AUTH_TOKEN || null;

async function approveAdminAccount() {
  try {
    const userId = process.argv[2];
    const approvalCode = process.argv[3];

    if (!userId || !approvalCode) {
      console.error('❌ Usage: node scripts/approve-admin-account.js [user-id] [approval-code]');
      process.exit(1);
    }

    const headers = {
      'Content-Type': 'application/json'
    };

    if (AUTH_TOKEN) {
      headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
    }

    console.log(`\n📝 Approving admin account: ${userId}`);

    // Call external API to approve admin account
    const response = await fetch(`${EXTERNAL_API_URL}?action=approve_admin`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_id: userId,
        approval_code: approvalCode
      })
    });

    const result = await response.json();

    if (!response.ok || result.status === 'error') {
      console.error('❌ Error approving account:', result.message || 'Unknown error');
      process.exit(1);
    }

    console.log('✅ Admin account approved successfully!');
    console.log(result);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

approveAdminAccount();
