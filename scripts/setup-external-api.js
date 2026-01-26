#!/usr/bin/env node

/**
 * Medical Supplies - External API Database Setup Script
 * Node.js version for cross-platform compatibility
 * 
 * Usage:
 *   node scripts/setup-external-api.js [options]
 *   npm run setup:external-api
 */

const https = require('https');
const http = require('http');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.error(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.blue}${msg}${colors.reset}`),
};

// Parse command line arguments
const args = process.argv.slice(2);
let apiUrl = process.env.API_URL || 'https://med.layonsconstruction.com/api.php';
let adminEmail = process.env.ADMIN_EMAIL || 'admin@biolegend.local';
let adminPassword = process.env.ADMIN_PASSWORD || 'Biolegend2024!Admin';
let dryRun = false;

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--api-url':
      apiUrl = args[++i];
      break;
    case '--email':
      adminEmail = args[++i];
      break;
    case '--password':
      adminPassword = args[++i];
      break;
    case '--dry-run':
      dryRun = true;
      break;
    case '--help':
      console.log(`
Usage: node scripts/setup-external-api.js [options]
       npm run setup:external-api

Options:
  --api-url URL         API endpoint URL
  --email EMAIL         Admin email
  --password PASSWORD   Admin password
  --dry-run            Show what would be done without actually doing it
  --help               Show this help message

Environment Variables:
  API_URL              Override API URL
  ADMIN_EMAIL          Override admin email
  ADMIN_PASSWORD       Override admin password
      `);
      process.exit(0);
      break;
  }
}

// Helper function to make HTTP requests
function makeRequest(url, method, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = client.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: parsed,
            raw: responseData,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: null,
            raw: responseData,
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Main setup function
async function runSetup() {
  try {
    // Display header
    console.log(`\n${colors.blue}${'='.repeat(55)}${colors.reset}`);
    console.log(`${colors.blue}Medical Supplies - External API Setup${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(55)}${colors.reset}\n`);

    // Display configuration
    log.info(`API URL: ${apiUrl}`);
    log.info(`Admin Email: ${adminEmail}`);
    log.info(`Password: [***hidden***]`);
    if (dryRun) {
      log.warning('Running in DRY RUN mode (no changes will be made)');
    }

    // Step 1: Test API connectivity
    log.section('Step 1: Testing API Connectivity');
    log.info(`Testing connection to: ${apiUrl}`);

    try {
      const healthResponse = await makeRequest(`${apiUrl}?action=health`, 'GET');
      log.success(`API is accessible (HTTP ${healthResponse.status})`);
    } catch (err) {
      log.error(`Failed to reach API: ${err.message}`);
      process.exit(1);
    }

    // Step 2: Initialize database and create admin user
    log.section('Step 2: Initializing Database & Creating Admin User');

    if (dryRun) {
      log.info('Would execute:');
      console.log(
        `  POST ${apiUrl}?action=setup\n  {"email":"${adminEmail}","password":"***"}`
      );
    } else {
      log.info(`Creating admin user: ${adminEmail}`);

      const setupResponse = await makeRequest(`${apiUrl}?action=setup`, 'POST', {
        email: adminEmail,
        password: adminPassword,
      });

      if (setupResponse.status === 200 && setupResponse.data?.status === 'success') {
        log.success(`Admin user created (HTTP ${setupResponse.status})`);
        console.log(
          JSON.stringify(
            {
              status: setupResponse.data.status,
              message: setupResponse.data.message,
              email: setupResponse.data.email,
            },
            null,
            2
          )
        );
      } else {
        log.error(
          `Failed to create admin user (HTTP ${setupResponse.status}): ${setupResponse.data?.message || 'Unknown error'}`
        );
        console.log(setupResponse.raw);
        process.exit(1);
      }
    }

    // Step 3: Verify login
    log.section('Step 3: Verifying Authentication');

    if (dryRun) {
      log.info('Would execute:');
      console.log(
        `  POST ${apiUrl}?action=login\n  {"email":"${adminEmail}","password":"***"}`
      );
    } else {
      log.info('Attempting login with created credentials...');

      const loginResponse = await makeRequest(`${apiUrl}?action=login`, 'POST', {
        email: adminEmail,
        password: adminPassword,
      });

      if (loginResponse.status === 200 && loginResponse.data?.token) {
        log.success(`Login successful (HTTP ${loginResponse.status})`);
        console.log(
          JSON.stringify(
            {
              email: loginResponse.data.user?.email,
              role: loginResponse.data.user?.role,
            },
            null,
            2
          )
        );

        if (loginResponse.data.token) {
          log.success('JWT Token obtained');
          console.log(`Token: ${loginResponse.data.token.substring(0, 50)}...`);
        }
      } else {
        log.error(
          `Login verification failed (HTTP ${loginResponse.status}): ${loginResponse.data?.message || 'Unknown error'}`
        );
        console.log(loginResponse.raw);
        process.exit(1);
      }
    }

    // Final summary
    console.log(`\n${colors.blue}${'='.repeat(55)}${colors.reset}`);
    if (dryRun) {
      log.warning('DRY RUN COMPLETE');
    } else {
      log.success('SETUP COMPLETE');
      console.log(`\nAdmin Credentials:
  ${colors.blue}Email:${colors.reset} ${adminEmail}
  ${colors.blue}Password:${colors.reset} [stored securely]

Next steps:
  1. Open the application in your browser
  2. Navigate to: https://your-app-url/admin-init-external
  3. Or login with the credentials above`);
    }
    console.log(`${colors.blue}${'='.repeat(55)}${colors.reset}\n`);

    process.exit(0);
  } catch (error) {
    log.error(`Unexpected error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run setup
runSetup();
