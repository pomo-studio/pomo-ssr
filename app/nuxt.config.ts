// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  
  // Nitro configuration for AWS Lambda
  nitro: {
    preset: 'aws-lambda',
    // Additional lambda-specific config
    awsLambda: {
      // Use streaming for larger responses
      streaming: false
    },

    // Route-specific cache rules
    // CloudFront respects these Cache-Control headers
    routeRules: {
      // Static pages - cache for 1 hour
      // Good for content that rarely changes
      '/about': {
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=3600'
        }
      },

      // Homepage - short cache (10 seconds)
      // Shows time updates but reduces Lambda calls
      '/': {
        headers: {
          'Cache-Control': 'public, max-age=10, s-maxage=10'
        }
      },

      // Health endpoint - cache for 30 seconds
      // Frequently called by monitoring, safe to cache briefly
      '/api/health': {
        headers: {
          'Cache-Control': 'public, max-age=30, s-maxage=30'
        }
      },

      // Weather API - cache for 5 minutes
      // External API data changes slowly, caching reduces rate limits
      '/api/weather': {
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=300'
        }
      },

      // Dashboard API - no cache
      // Real-time counter needs fresh data on every request
      '/api/dashboard': {
        headers: {
          'Cache-Control': 'no-cache, private, must-revalidate'
        }
      },

      // Counter POST - never cache mutations
      '/api/counter': {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    }
  },

  // Runtime config (environment variables)
  runtimeConfig: {
    // Private keys (server-only)
    dynamodbTable: process.env.DYNAMODB_TABLE || 'ssr-poc-visits',
    primaryRegion: process.env.PRIMARY_REGION || 'us-east-1',
    drRegion: process.env.DR_REGION || 'us-west-2',
    
    // Public keys (exposed to client)
    public: {
      appName: 'SSR Server Clock',
      apiBase: '/api'
    }
  },

  // Global CSS
  css: ['~/assets/css/main.css'],

  // App head config
  app: {
    head: {
      title: 'SSR Server Clock',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Multi-region SSR demo with Nuxt/Nitro on AWS Lambda' }
      ]
    }
  }
})
