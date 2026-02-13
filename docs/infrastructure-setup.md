# Infrastructure Setup

Before deploying this application, you need to provision the AWS infrastructure using the [terraform-aws-serverless-ssr](https://github.com/pomo-studio/terraform-aws-serverless-ssr).

## Quick Start

### 1. Create Infrastructure Directory

```bash
mkdir -p ~/my-app-infrastructure
cd ~/my-app-infrastructure
```

### 2. Create main.tf

```hcl
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  alias  = "primary"
  region = "us-east-1"
}

provider "aws" {
  alias  = "dr"
  region = "us-west-2"
}

module "ssr" {
  source  = "pomo-studio/serverless-ssr/aws"
  version = "~> 2.2"

  providers = {
    aws.primary = aws.primary
    aws.dr      = aws.dr
  }

  project_name = "my-app"
  domain_name  = "example.com"
  subdomain    = "app"
  environment  = "prod"

  # Optional features
  enable_dr         = true
  create_ci_cd_user = true
}

output "app_config" {
  value     = module.ssr.app_config
  sensitive = true
}

output "application_url" {
  value = module.ssr.application_url
}
```

### 3. Deploy Infrastructure

```bash
terraform init
terraform plan
terraform apply
```

### 4. Export Configuration for App

```bash
# Export to your app directory
mkdir -p ~/my-app/config
terraform output -json app_config > ~/my-app/config/infra-outputs.json

# Note the application URL
terraform output application_url
```

### 5. Get CI/CD Credentials (if enabled)

```bash
terraform output cicd_aws_access_key_id
terraform output cicd_aws_secret_access_key  # sensitive
```

Save these for GitHub secrets (see below).

---

## Alternative: Using Module Examples

The module includes pre-built examples:

```bash
# Clone module
git clone https://github.com/pomo-studio/terraform-aws-serverless-ssr.git
cd terraform-aws-serverless-ssr/examples/basic

# Create terraform.tfvars
cat > terraform.tfvars << 'EOF'
project_name = "my-app"
domain_name  = "example.com"
subdomain    = "app"
environment  = "dev"
enable_dr         = false
create_ci_cd_user = false
EOF

# Deploy
terraform init
terraform apply

# Export config
cd -
terraform output -json app_config > ~/my-app/config/infra-outputs.json
```

---

## Required GitHub Secrets

Add these to your app repository (`serverless-ssr-app`):

| Secret | Value | Source |
|--------|-------|--------|
| `AWS_ACCESS_KEY_ID` | CI/CD access key | `terraform output cicd_aws_access_key_id` |
| `AWS_SECRET_ACCESS_KEY` | CI/CD secret | `terraform output cicd_aws_secret_access_key` |
| `AWS_PRIMARY_REGION` | AWS region | e.g., `us-east-1` |
| `INFRA_OUTPUTS_JSON` | Full config | Contents of `config/infra-outputs.json` |

### How to Add Secrets

1. Go to GitHub → Your repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret from the table above

For `INFRA_OUTPUTS_JSON`, copy the entire contents of `config/infra-outputs.json`.

---

## Understanding the File Structure

After setup, you'll have two directories:

```
~/my-app-infrastructure/         # Infrastructure (Terraform)
├── main.tf
├── .terraform/
└── terraform.tfstate

~/my-app/                        # Application (this template)
├── app/                         # Nuxt app (package.json here!)
│   ├── package.json
│   └── ...
├── config/
│   └── infra-outputs.json      # Copied from terraform
├── scripts/
│   └── deploy.sh               # Run from root
└── ...
```

**Important**: 
- Terraform runs in `~/my-app-infrastructure/`
- The deploy script (`./scripts/deploy.sh`) runs from `~/my-app/` (root of app repo)
- `npm install` runs inside `~/my-app/app/` (where package.json lives)

---

## Infrastructure Resources Created

- **Lambda Functions**: Primary and DR regions with bootstrap code
- **CloudFront Distribution**: Global CDN with origin failover
- **S3 Buckets**: Static assets + Lambda deployment packages
- **DynamoDB**: Global table for data persistence
- **IAM Roles**: Execution role + optional CI/CD user

---

## Module Documentation

For full module documentation, see:
- [terraform-aws-serverless-ssr README](https://github.com/pomo-studio/terraform-aws-serverless-ssr#readme)
- [Basic Example](https://github.com/pomo-studio/terraform-aws-serverless-ssr/tree/main/examples/basic)
- [Complete Example](https://github.com/pomo-studio/terraform-aws-serverless-ssr/tree/main/examples/complete)

---

## Next Steps

See [Deployment Guide](deployment.md) for application deployment instructions.
