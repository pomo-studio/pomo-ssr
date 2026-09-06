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
      '/about': {
        headers: {
          'Cache-Control': 'public, max-age=3600, s-maxage=3600'
        }
      },

      // Homepage - short cache so renders stay current
      '/': {
        headers: {
          'Cache-Control': 'public, max-age=10, s-maxage=10'
        }
      },

      // Health endpoint - cache for 30 seconds
      '/api/health': {
        headers: {
          'Cache-Control': 'public, max-age=30, s-maxage=30'
        }
      },

      // Render proof API - no cache, every request must be fresh
      '/api/render': {
        headers: {
          'Cache-Control': 'no-cache, private, must-revalidate'
        }
      }
    }
  },

  // Runtime config (environment variables)
  runtimeConfig: {
    // Private keys (server-only)
    dynamodbTable: process.env.DYNAMODB_TABLE || 'pomo-ssr-visits',
    primaryRegion: process.env.PRIMARY_REGION || 'us-east-1',
    drRegion: process.env.DR_REGION || 'us-west-2',

    // Public keys (exposed to client)
    public: {
      appName: 'ssr.pomo.dev',
      apiBase: '/api'
    }
  },

  // Global CSS
  css: ['~/assets/css/main.css'],

  // App head config
  app: {
    head: {
      title: 'ssr.pomo.dev',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'A live server-side rendered proof running on AWS Lambda, deployed with terraform-aws-serverless-ssr.' }
      ]
    }
  }
})
