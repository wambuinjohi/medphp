#!/usr/bin/env node

/**
 * Complete Database Extraction - External API Version
 * This script now calls the external API (med.layonsconstruction.com/api.php)
 * for database operations instead of Supabase
 */

const EXTERNAL_API_URL = process.env.VITE_EXTERNAL_API_URL || 'https://med.layonsconstruction.com/api.php';
const AUTH_TOKEN = process.env.API_AUTH_TOKEN || null;

if (!EXTERNAL_API_URL) {
  console.error('❌ Error: External API URL not found in environment variables');
  console.error('Please set VITE_EXTERNAL_API_URL');
  process.exit(1);
}

async function extractDatabase() {
  console.log('🗄️ Extracting database schema via external API...');
  console.log('=====================================\n');

  try {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (AUTH_TOKEN) {
      headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
    }

    // Call the external API to get database schema
    const response = await fetch(`${EXTERNAL_API_URL}?action=export_schema`, {
      method: 'GET',
      headers
    });

    const result = await response.json();

    if (!response.ok || result.status === 'error') {
      console.error('❌ Error:', result.message || 'Failed to extract database');
      process.exit(1);
    }

    if (result.schema || result.data) {
      console.log('✅ Database schema extracted successfully');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error('❌ No schema data returned from API');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error extracting database:', error);
    process.exit(1);
  }
}

// Run the extraction
extractDatabase();
