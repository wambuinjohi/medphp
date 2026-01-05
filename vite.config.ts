import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Use local auth server for development if VITE_USE_LOCAL_AUTH is set
  const useLocalAuth = process.env.VITE_USE_LOCAL_AUTH === 'true';
  const apiUrl = useLocalAuth 
    ? 'http://localhost:3001'
    : (process.env.VITE_EXTERNAL_API_URL || 'https://med.wayrus.co.ke');

  if (useLocalAuth) {
    console.log('✅ Using LOCAL authentication server at http://localhost:3001');
  } else {
    console.log(`🌐 Using REMOTE API at ${apiUrl}`);
  }

  return {
    define: {
      'process.env': process.env,
    },
    server: {
      host: "::",
      port: 8080,
      hmr: false,
      proxy: {
        // Proxy API requests to external backend or local server
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          rewrite: (path) => {
            // Pass through as-is for /api/* routes
            return path;
          },
        },
        '/api/db': {
          target: apiUrl,
          changeOrigin: true,
          rewrite: (path) => {
            // Convert /api/db/* paths to API calls
            const pathParts = path.replace('/api/db', '').split('/').filter(Boolean);
            if (pathParts.length === 0) return '/?action=health';

            // Handle different endpoint patterns
            const [resource, action, id] = pathParts;
            if (resource === 'health') return '/?action=health';
            if (resource === 'auth-context') return `/?action=check_auth`;
            if (resource === 'select' && action) return `/?action=read&table=${action}`;
            if (resource === 'select-one' && action && id) return `/?action=read&table=${action}&where={"id":"${id}"}`;
            if (resource === 'insert' && action) return `/?action=create&table=${action}`;
            if (resource === 'insert-many' && action) return `/?action=create&table=${action}`;
            if (resource === 'update' && action && id) return `/?action=update&table=${action}&where={"id":"${id}"}`;
            if (resource === 'update-many' && action) return `/?action=update&table=${action}`;
            if (resource === 'delete' && action && id) return `/?action=delete&table=${action}&where={"id":"${id}"}`;
            if (resource === 'delete-many' && action) return `/?action=delete&table=${action}`;
            if (resource === 'raw') return '/?action=raw';
            if (resource === 'auth') {
              if (action === 'can-read') return '/?action=check_auth';
              if (action === 'can-write') return '/?action=check_auth';
              if (action === 'can-delete') return '/?action=check_auth';
            }

            return path;
          },
        },
      },
    },
    plugins: [
      react(),
      mode === 'development' &&
      componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
