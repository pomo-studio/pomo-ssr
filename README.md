# Serverless SSR App

A Nuxt.js application template for serverless SSR deployment on AWS Lambda + CloudFront.

This is the **application template** that works with the [serverless-ssr-module](https://github.com/apitanga/serverless-ssr-module) infrastructure.

## Architecture

```
my-app/                          # Repository root
├── app/                         # Nuxt application (package.json here)
│   ├── package.json             # Dependencies defined here
│   ├── node_modules/            # Created by npm install (inside app/)
│   ├── pages/                   # Vue pages
│   ├── server/api/              # API routes
│   └── ...
├── scripts/
│   └── deploy.sh               # Run from root, does "cd app" internally
├── config/
│   └── infra-outputs.json      # Terraform output (copied here)
└── README.md
```

**Important**: `package.json` is in `app/`, not root. The deploy script handles this automatically.

## Quick Start

### 1. Deploy Infrastructure First

See [serverless-ssr-module](https://github.com/apitanga/serverless-ssr-module) for infrastructure setup.

```bash
# After infrastructure is deployed, export config
terraform output -json app_config > ~/my-app/config/infra-outputs.json
```

### 2. Clone and Configure App

```bash
# Clone this template
git clone https://github.com/apitanga/serverless-ssr-app.git my-app
cd my-app

# Copy infrastructure config (creates config/infra-outputs.json)
cp ~/my-app-infra/infra-outputs.json config/

# Deploy (deploy.sh handles npm install internally)
./scripts/deploy.sh
```

### Directory Structure Explained

```
my-app/                          # Run ./scripts/deploy.sh from here
├── app/                         # Nuxt app directory
│   ├── package.json             # npm reads this
│   ├── node_modules/            # npm creates this (after install)
│   ├── assets/                  # Static assets
│   ├── pages/                   # Vue pages (index.vue, about.vue)
│   ├── server/api/              # API routes (health, counter, etc.)
│   └── ...
├── scripts/
│   └── deploy.sh                # Entry point - run from root
├── config/
│   └── infra-outputs.json       # Infrastructure configuration
└── .github/workflows/           # CI/CD
```

**Key Point**: The deploy script runs from root but does `cd app` internally before `npm install`.

## Development Workflow

### Option A: Deploy Only (Quick)

```bash
cd my-app
./scripts/deploy.sh              # Handles everything internally
```

### Option B: Develop Locally First

```bash
cd my-app

# Copy infrastructure config
cp ~/my-app-infra/infra-outputs.json config/

# Install dependencies (in app/ directory)
cd app
npm install

# Start development server
npm run dev                      # http://localhost:3000

# Make your changes...

# Then deploy from root
cd ..
./scripts/deploy.sh
```

### Option C: CI/CD (GitHub Actions)

Push to `main` triggers automatic deployment (requires GitHub secrets).

```bash
git add .
git commit -m "My changes"
git push origin main            # GitHub Actions handles deploy
```

## Project Structure

```
.
├── app/                          # Nuxt application
│   ├── assets/                   # Static assets (CSS, images)
│   │   └── css/main.css
│   ├── layouts/                  # Vue layouts
│   │   └── default.vue
│   ├── pages/                    # File-based routing
│   │   ├── index.vue             # Homepage with SSR counter
│   │   └── about.vue             # About page
│   ├── server/
│   │   └── api/                  # API routes
│   │       ├── health.get.ts     # Health check endpoint
│   │       ├── counter.post.ts   # Visit counter (DynamoDB)
│   │       ├── dashboard.get.ts  # Dashboard data
│   │       └── weather.get.ts    # Weather demo API
│   ├── package.json              # Dependencies and scripts
│   ├── nuxt.config.ts            # Nuxt configuration
│   └── tsconfig.json             # TypeScript config
├── config/
│   └── infra-outputs.json        # Terraform outputs (gitignored)
├── scripts/
│   └── deploy.sh                 # Deployment script (run from root)
├── .github/workflows/
│   ├── ci.yml                    # PR checks
│   └── deploy.yml                # Deploy to AWS
└── docs/
    ├── infrastructure-setup.md   # How to set up infra
    └── deployment.md             # Deployment guide
```

## NPM Scripts (run inside app/ directory)

```bash
cd my-app/app                    # Go to app directory

npm install                      # Install dependencies
npm run dev                      # Start dev server (localhost:3000)
npm run build                    # Build for production
npm run build:lambda             # Build for AWS Lambda
npm run preview                  # Preview production build
```

**Note**: `package.json` is in `app/`, so npm commands must run from there (unless using the deploy script which handles it).

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check for monitoring |
| `/api/counter` | POST | Increment visit counter in DynamoDB |
| `/api/dashboard` | GET | Get dashboard data |
| `/api/weather` | GET | Sample weather API (external) |

## Deployment Script (`scripts/deploy.sh`)

The deploy script performs these steps:

1. **Read config** from `config/infra-outputs.json`
2. **Build app**: `cd app && npm install && npm run build`
3. **Package**: Create `lambda-deploy.zip` from `.output/server/`
4. **Upload**: Copy zip to S3 deployment bucket(s)
5. **Update Lambda**: Update function code in primary (and DR)
6. **Sync static**: Upload static assets to S3
7. **Invalidate**: Clear CloudFront cache

**Usage**: Run from repository root:
```bash
cd my-app
./scripts/deploy.sh
```

## Configuration

The app reads infrastructure configuration from `config/infra-outputs.json`. This file is generated by the [serverless-ssr-module](https://github.com/apitanga/serverless-ssr-module) and contains:

- Lambda function names and ARNs
- S3 bucket names for deployments and static assets
- CloudFront distribution ID for cache invalidation
- DynamoDB table name
- Application URL

## CI/CD (GitHub Actions)

### Required Secrets

Add these to your GitHub repository:

| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | From `terraform output cicd_aws_access_key_id` |
| `AWS_SECRET_ACCESS_KEY` | From `terraform output cicd_aws_secret_access_key` |
| `AWS_PRIMARY_REGION` | e.g., `us-east-1` |
| `INFRA_OUTPUTS_JSON` | Contents of `config/infra-outputs.json` |

See [Infrastructure Setup](docs/infrastructure-setup.md) for details.

### Workflows

- **ci.yml**: Runs on PRs - lint, typecheck, build
- **deploy.yml**: Runs on push to main - deploy to AWS

## Related Repositories

| Repository | Purpose |
|------------|---------|
| [serverless-ssr-module](https://github.com/apitanga/serverless-ssr-module) | Terraform module for AWS infrastructure |
| [serverless-ssr-pattern](https://github.com/apitanga/serverless-ssr-pattern) | Original project (archived/inspiration) |

## Documentation

- [Infrastructure Setup](docs/infrastructure-setup.md) - Deploy the infrastructure
- [Deployment Guide](docs/deployment.md) - Deploy application updates
- [Caching Strategy](docs/CACHING.md) - CloudFront caching configuration and best practices

## License

MIT
