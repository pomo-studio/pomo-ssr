# Deployment Guide

## Overview

This guide covers deploying the application to AWS. The infrastructure should already be deployed (see [Infrastructure Setup](infrastructure-setup.md)).

For the complete point-A-to-point-B walkthrough — including fork setup, AWS
bootstrap, HCP Terraform workspace, and first verify — see the
[Getting Started walkthrough](GETTING-STARTED.md). This guide covers only the
deployment step.

## Important Directory Structure

```
my-app/                          # Repository root (run deploy from here)
├── app/                         # Nuxt application
│   ├── package.json             # npm reads this
│   ├── node_modules/            # npm creates this after install
│   └── ...
├── config/
│   └── infra-outputs.json       # Infrastructure config (required)
└── scripts/
    └── deploy.sh                # Entry point - run from root
```

**Key Point**: Always run `./scripts/deploy.sh` from the repository root, not from `app/`.

---

## Quick Deploy

```bash
cd ~/my-app                      # Go to app repository root
./scripts/deploy.sh              # Deploy script handles everything
```

The deploy script will:
1. Read `config/infra-outputs.json`
2. `cd app && npm install` (installs dependencies)
3. Build the application for Lambda
4. Package and upload to S3
5. Update Lambda function code
6. Sync static assets
7. Invalidate CloudFront cache

---

## Step-by-Step Deployment

### 1. Prerequisites Check

```bash
cd ~/my-app

# Check AWS credentials
aws sts get-caller-identity

# Check infrastructure config exists
ls -la config/infra-outputs.json

# Verify deploy script is executable
ls -la scripts/deploy.sh
```

### 2. Ensure Infrastructure Config is Present

```bash
# If missing, re-export from terraform
cd ~/my-app-infrastructure
terraform output -json app_config > ~/my-app/config/infra-outputs.json

cd ~/my-app
```

### 3. Deploy

```bash
# From repository root (my-app/)
./scripts/deploy.sh
```

Expected output:
```
📋 Loading configuration from config/infra-outputs.json
🚀 Deploying my-app
   Primary: us-east-1 | DR: us-west-2
🔨 Building application...
📦 Creating deployment package...
☁️ Uploading to S3...
🔄 Updating Lambda functions...
🌐 Syncing static assets...
🧹 Invalidating CloudFront cache...
✅ Deployment complete!
   URL: https://app.example.com
```

### 4. Verify Deployment

```bash
# Get URL from config
cat config/infra-outputs.json | jq -r '.application_url.value'

# Test health endpoint
curl https://your-app-url/api/health

# Expected response:
# {"status":"ok","timestamp":"2026-..."}
```

---

## Development Deployment

### Local Development (Before Deploying)

```bash
cd ~/my-app

# Copy infrastructure config (if not done)
cp ~/my-app-infrastructure/infra-outputs.json config/

# Install dependencies (run in app/ directory)
cd app
npm install

# Start development server
npm run dev

# App will be at http://localhost:3000
```

**Note**: `npm install` must be run inside `app/` directory where `package.json` lives.

### Deploy After Changes

```bash
# From repository root
cd ~/my-app

# Deploy changes
./scripts/deploy.sh
```

---

## CI/CD Deployment (GitHub Actions)

### Automatic Deploy on Push

1. Ensure GitHub secrets are configured (see [Infrastructure Setup](infrastructure-setup.md))
2. Push to `main` branch:

```bash
git add .
git commit -m "My changes"
git push origin main
```

GitHub Actions will:
- Build the application
- Run tests
- Deploy to AWS (if secrets are configured)

### Manual Trigger

Go to GitHub → Actions → Deploy → Run workflow

---

## Troubleshooting

### "Infrastructure config not found"

```bash
# Re-export from terraform
cd ~/my-app-infrastructure
terraform output -json app_config > ~/my-app/config/infra-outputs.json
```

### "npm: command not found" or "no such file or directory: package.json"

You're running `npm install` from the wrong directory.

```bash
# Wrong ❌
cd ~/my-app
npm install                      # package.json is in app/, not here

# Correct ✓
cd ~/my-app/app
npm install                      # Now it finds package.json

# Or let deploy.sh handle it ✓
cd ~/my-app
./scripts/deploy.sh              # Script does "cd app && npm install"
```

### "No valid credential sources found"

```bash
# Configure AWS credentials
awslogin pitanga                 # Or your SSO profile
export AWS_PROFILE=pitanga

# Or set environment variables
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_REGION=us-east-1
```

### "Lambda function not found"

Check that `project_name` in your app matches what you used in infrastructure:

```bash
# Check infrastructure
cd ~/my-app-infrastructure
terraform output lambda_function_name_primary

# Check app config
cd ~/my-app
cat config/infra-outputs.json | jq '.app_config.value.project_name'
```

### "EACCES: permission denied, open '.../.output/...'"

```bash
# Clean and rebuild
cd ~/my-app/app
rm -rf .output node_modules
npm install
cd ..
./scripts/deploy.sh
```

---

## Deployment Script Details

The `scripts/deploy.sh` script performs these steps:

1. **Verify Config**: Check `config/infra-outputs.json` exists
2. **Parse Config**: Extract Lambda names, S3 buckets, CloudFront ID
3. **Install Dependencies**: `cd app && npm install`
4. **Build**: `NITRO_PRESET=aws-lambda npm run build`
5. **Package**: Zip `.output/server/` → `lambda-deploy.zip`
6. **Upload to S3**: Copy zip to deployment bucket(s)
7. **Update Lambda**: Update function code in AWS
8. **Sync Static Assets**: Upload `.output/public/` to S3
9. **Invalidate Cache**: Clear CloudFront cache

---

## Rollback

To rollback to a previous version:

```bash
# Go to previous git commit
git log --oneline
git checkout <previous-commit-hash>

# Re-deploy that version
./scripts/deploy.sh

# Or restore main
git checkout main
```

---

## Related

- [Infrastructure Setup](infrastructure-setup.md) - Deploy/modify infrastructure
- [Module README](https://github.com/pomo-studio/terraform-aws-serverless-ssr#readme) - Infrastructure module docs
