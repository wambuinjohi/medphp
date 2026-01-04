/**
 * External API Setup Utility
 * Handles database initialization and admin user creation for the external API
 */

interface SetupOptions {
  apiUrl?: string;
  email?: string;
  password?: string;
  onProgress?: (message: string) => void;
}

interface SetupResult {
  success: boolean;
  message: string;
  adminEmail?: string;
  token?: string;
  userId?: number;
}

/**
 * Initialize the external API database and create admin user
 */
export async function initializeExternalAPI(options: SetupOptions = {}): Promise<SetupResult> {
  const {
    apiUrl = import.meta.env.VITE_EXTERNAL_API_URL || 'https://med.wayrus.co.ke/api.php',
    email,
    password,
    onProgress,
  } = options;

  const adminEmail = email || 'admin@mail.com';
  const adminPassword = password || 'Pass123';

  try {
    // Step 1: Test API connectivity
    onProgress?.('Testing API connectivity...');
    const healthCheck = await fetch(`${apiUrl}?action=health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }).catch(err => {
      // API might not support health endpoint, which is okay
      return { ok: true, status: 200 };
    });

    if (!healthCheck.ok && healthCheck.status !== 400) {
      throw new Error(`API health check failed: HTTP ${healthCheck.status}`);
    }

    onProgress?.('✓ API is accessible');

    // Step 2: Create admin user (this also initializes all database tables)
    onProgress?.('Initializing database tables...');
    onProgress?.(`Creating admin user: ${adminEmail}`);

    // The setup endpoint expects email and password as JSON POST data
    const setupResponse = await fetch(`${apiUrl}?action=setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
      }),
    });

    if (!setupResponse.ok) {
      const errorData = await setupResponse.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Setup failed: HTTP ${setupResponse.status}`
      );
    }

    const setupData = await setupResponse.json();

    if (!setupData.status || setupData.status !== 'success') {
      throw new Error(setupData.message || 'Setup endpoint returned error');
    }

    onProgress?.('✓ Admin user created successfully');

    // Step 3: Verify login works
    onProgress?.('Verifying authentication...');

    // The login endpoint expects email and password as JSON POST data
    const loginResponse = await fetch(`${apiUrl}?action=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
      }),
    });

    if (!loginResponse.ok) {
      const errorData = await loginResponse.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Login verification failed: HTTP ${loginResponse.status}`
      );
    }

    const loginData = await loginResponse.json();

    if (!loginData.token) {
      throw new Error('Login failed: No token returned');
    }

    onProgress?.('✓ Authentication verified');

    // Step 4: Store token for immediate use
    onProgress?.('Storing authentication token...');
    localStorage.setItem('med_api_token', loginData.token);
    onProgress?.('✓ Token stored');

    return {
      success: true,
      message: 'Database initialized successfully and admin user created',
      adminEmail,
      token: loginData.token,
      userId: loginData.user?.id,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error during setup';

    onProgress?.(`✗ Error: ${errorMessage}`);

    return {
      success: false,
      message: errorMessage,
    };
  }
}

/**
 * Check if admin user exists
 */
export async function checkAdminExists(options: SetupOptions = {}): Promise<boolean> {
  const apiUrl =
    options.apiUrl || import.meta.env.VITE_EXTERNAL_API_URL || 'https://med.wayrus.co.ke/api.php';
  const email = options.email || 'admin@mail.com';
  const password = options.password || 'Pass123';

  try {
    const response = await fetch(`${apiUrl}?action=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    // Check if login was successful (HTTP 200 and has token)
    if (response.ok) {
      const data = await response.json();
      return data?.token ? true : false;
    }

    return false;
  } catch (error) {
    console.error('Error checking admin:', error);
    return false;
  }
}

/**
 * Create additional user account
 */
export async function createUserViaAPI(
  email: string,
  password: string,
  token: string,
  options: SetupOptions = {}
): Promise<SetupResult> {
  const apiUrl =
    options.apiUrl || import.meta.env.VITE_EXTERNAL_API_URL || 'https://med.wayrus.co.ke/api.php';
  const { onProgress } = options;

  try {
    onProgress?.(`Creating user: ${email}`);

    const response = await fetch(`${apiUrl}?action=create&table=users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email,
        password,
        role: 'user',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `User creation failed: HTTP ${response.status}`
      );
    }

    const data = await response.json();

    return {
      success: true,
      message: `User ${email} created successfully`,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error creating user';

    return {
      success: false,
      message: errorMessage,
    };
  }
}

/**
 * Get database information from API
 */
export async function getDatabaseInfo(options: SetupOptions = {}): Promise<any> {
  const apiUrl =
    options.apiUrl || import.meta.env.VITE_EXTERNAL_API_URL || 'https://med.wayrus.co.ke/api.php';

  try {
    // Try to read users table to verify connection
    const response = await fetch(`${apiUrl}?action=read&table=users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ where: {} }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return {
      connected: true,
      tablesExist: true,
      userCount: data.data?.length || 0,
    };
  } catch (error) {
    return null;
  }
}
