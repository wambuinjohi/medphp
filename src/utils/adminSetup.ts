/**
 * Admin Setup Utility - External API Version
 * Uses med.wayrus.co.ke/api.php for admin user creation
 */

const EXTERNAL_API_URL = import.meta.env.VITE_EXTERNAL_API_URL || 'https://med.wayrus.co.ke/api.php';

export interface CreateAdminOptions {
  email: string;
  password: string;
  fullName: string;
  onProgress?: (message: string) => void;
}

export async function createAdminUser(options: CreateAdminOptions) {
  const { email, password, fullName, onProgress } = options;

  if (!EXTERNAL_API_URL) {
    throw new Error('External API URL not configured');
  }

  try {
    // Step 1: Check for default company
    onProgress?.('📋 Checking for default company...');

    const checkCompanyResponse = await fetch(`${EXTERNAL_API_URL}?action=list_companies&limit=1`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const companiesData = await checkCompanyResponse.json();
    let companyId: string | null = null;

    if (companiesData && companiesData.data && companiesData.data.length > 0) {
      companyId = companiesData.data[0].id;
      onProgress?.(`✅ Found company: ${companiesData.data[0].name}`);
    } else {
      // Create default company
      onProgress?.('📋 Creating default company...');

      const createCompanyResponse = await fetch(`${EXTERNAL_API_URL}?action=create_company`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Medical Supplies',
          email: email,
          currency: 'KES',
          timezone: 'Africa/Nairobi'
        })
      });

      const companyResult = await createCompanyResponse.json();

      if (!createCompanyResponse.ok || companyResult.status === 'error') {
        throw new Error(`Failed to create company: ${companyResult.message || 'Unknown error'}`);
      }

      companyId = companyResult.data?.id || companyResult.id;
      onProgress?.(`✅ Created company: Medical Supplies`);
    }

    if (!companyId) {
      throw new Error('Failed to get or create company');
    }

    // Step 2: Create admin user
    onProgress?.('🔐 Creating admin user...');

    const createUserResponse = await fetch(`${EXTERNAL_API_URL}?action=admin_create_user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
        role: 'super_admin',
        company_id: companyId
      })
    });

    const userResult = await createUserResponse.json();

    if (!createUserResponse.ok || userResult.status === 'error') {
      throw new Error(`Failed to create admin user: ${userResult.message || 'Unknown error'}`);
    }

    onProgress?.('✅ Admin user created successfully!');

    return {
      success: true,
      userId: userResult.user_id || userResult.data?.id,
      email,
      role: 'super_admin',
      companyId
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    onProgress?.(`❌ Error: ${errorMessage}`);
    throw error;
  }
}
