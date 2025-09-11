/**
 * Environment Configuration
 * Manages different API endpoints for local development vs production
 */

const ENV = {
  development: {
    API_BASE_URL: 'http://localhost:8000/api',
    ENV_NAME: 'development',
    DEBUG: true,
  },
  production: {
    API_BASE_URL: 'https://app.epanotes.com/api', // HTTPS with custom domain
    ENV_NAME: 'production',
    DEBUG: false,
  },
  // Add staging environment if needed
  staging: {
    API_BASE_URL: 'https://app.epanotes.com/api', // HTTPS with custom domain
    ENV_NAME: 'staging',
    DEBUG: true,
  }
};

/**
 * Get current environment configuration
 * Checks for environment variable first, then falls back to __DEV__
 */
const getCurrentEnv = () => {
  // Check for explicit environment variable first
  const envName = process.env.NODE_ENV;
  
  // If NODE_ENV is explicitly set, use it
  if (envName === 'development') {
    return ENV.development;
  }
  if (envName === 'staging') {
    return ENV.staging;
  }
  if (envName === 'production') {
    return ENV.production;
  }
  
  // Check if we're in React Native/Expo development mode
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return ENV.development;
  }
  
  // Default to production for safety
  return ENV.production;
};

const config = getCurrentEnv();

// Log current environment (only in development)
if (config.DEBUG) {
  console.log(`🌍 Environment: ${config.ENV_NAME}`);
  console.log(`🔗 API Base URL: ${config.API_BASE_URL}`);
}

export default config;
export { ENV };
