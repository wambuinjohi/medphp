# Welcome to your Lovable project

## Project info

## Project info

This repository contains the Management System application.

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE**

If you want to work locally using your own IDE, clone this repo and push changes.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s.
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Setting Up Your First Admin User

After deploying the application, you'll need to create the first admin user to get started.

### Quick Setup

1. **Get your Supabase Service Role Key:**
   - Go to your Supabase project: https://app.supabase.com/
   - Navigate to Settings → API
   - Copy your **Service Role Key** (⚠️ keep this secret!)

2. **Create the admin user:**

   ```bash
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   node scripts/create-first-admin.js
   ```

3. **Follow the interactive prompts** to set up:
   - Admin email
   - Secure password
   - Full name (optional)
   - Company details

### Alternative Setup Methods

**Command-line arguments:**
```bash
export SUPABASE_SERVICE_ROLE_KEY="your-key"
node scripts/create-first-admin.js admin@example.com "SecurePassword123!" "Admin Name"
```

**Environment variables:**
```bash
export SUPABASE_SERVICE_ROLE_KEY="your-key"
export ADMIN_EMAIL="admin@example.com"
export ADMIN_PASSWORD="SecurePassword123!"
export ADMIN_FULL_NAME="Admin Name"
node scripts/create-first-admin.js
```

### Full Documentation

For detailed setup instructions, troubleshooting, and security best practices, see [FIRST_ADMIN_SETUP.md](./FIRST_ADMIN_SETUP.md)

## How can I deploy this project?

Push your changes to your hosting provider or deploy using your preferred platform.

## Can I connect a custom domain to this project?

Yes, you can. Refer to your hosting provider's documentation for details on connecting domains.
