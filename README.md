# Pomo SSR

Demo site for **terraform-aws-serverless-ssr** — showcasing server-side rendering on AWS Lambda with multi-region failover.

**Live Demo**: [ssr.pomo.dev](https://ssr.pomo.dev)

---

## Project Structure

```
pomo-ssr/                       # Monorepo
├── infra/                      # Terraform infrastructure
│   ├── main.tf                 # Uses terraform-aws-serverless-ssr v2.2.4
│   ├── outputs.tf              # Exports app_config
│   ├── terraform.auto.tfvars   # Configuration
│   └── versions.tf             # Terraform Cloud backend
│
├── app/                        # Nuxt 3 SSR application
│   ├── pages/                  # Vue pages (clock demo)
│   ├── server/api/             # API endpoints
│   ├── package.json            # Dependencies
│   └── nuxt.config.ts          # Nuxt + caching config
│
├── config/
│   └── infra-outputs.json      # Auto-committed by sync workflow
│
├── scripts/
│   └── deploy.sh               # Deployment script
│
├── docs/
│   └── DEPLOYMENT.md           # Deployment workflow guide
│
└── .github/workflows/
    ├── infra.yml               # Terraform validation
    ├── ci.yml                  # App CI checks
    ├── deploy.yml              # Auto-deploy (OIDC)
    └── sync-infra-config.yml   # Auto-sync TF outputs
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CloudFront (Global)                       │
│         https://ssr.pomo.dev (ACM cert from pomo repo)      │
└──────────────────┬──────────────────────────────────────────┘
                   │
       ┌───────────┴───────────┐
       │   Origin Groups       │
       │   (Auto Failover)     │
       └───────────┬───────────┘
                   │
    ┌──────────────┴──────────────┐
    │                             │
┌───▼────────┐             ┌──────▼──────┐
│ Primary    │             │ DR          │
│ us-east-1  │             │ us-west-2   │
│            │             │             │
│ Lambda     │             │ Lambda      │
│ + S3       │             │ + S3        │
└────────────┘             └─────────────┘

Shared:
- DynamoDB (multi-region)
- Route53 zone (from pomo repo)
- ACM certificates (from pomo repo)
```

**Infrastructure managed by**: [terraform-aws-serverless-ssr](https://github.com/pomo-studio/terraform-aws-serverless-ssr) v2.2.4

---

## Quick Start

### Prerequisites

1. **pomo repo deployed** - Creates `ssr.pomo.dev` DNS, certificates, OIDC provider
2. **Terraform Cloud** - Workspace `pomossr` configured
3. **GitHub App** - TFC GitHub App installed

### 1. Infrastructure

Infrastructure is managed in Terraform Cloud:

```bash
# Workspace: Pitangaville/pomossr
# Triggers automatically on push to infra/**

# Check status
cd infra
terraform init
terraform plan  # Review changes
```

Infrastructure is applied via TFC UI after review.

### 2. Deploy Application

```bash
# From repository root
./scripts/deploy.sh
```

The deploy script:
1. Reads `config/infra-outputs.json`
2. Builds Nuxt app (`cd app && npm run build`)
3. Packages Lambda code
4. Uploads to S3 (primary + DR)
5. Updates Lambda functions
6. Syncs static assets
7. Invalidates CloudFront cache

---

## Development

### Local Development

```bash
cd app
npm install
npm run dev    # http://localhost:3000
```

### Make Changes

```bash
# Edit files in app/
vim app/pages/index.vue

# Test locally
cd app && npm run dev

# Build for Lambda
cd app && NITRO_PRESET=aws-lambda npm run build

# Deploy from root
cd .. && ./scripts/deploy.sh
```

---

## CI/CD (GitHub Actions)

### Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **infra.yml** | `infra/**` changes | Terraform format + validate |
| **ci.yml** | `app/**` changes | Lint, typecheck, build |
| **deploy.yml** | Push to `main` (app changes) | Auto-deploy to AWS (OIDC) |
| **sync-infra-config.yml** | `infra/**` changes | Auto-sync outputs to GitHub Variable |

### Required GitHub Configuration

**Secrets:**
- `AWS_ROLE_ARN` - IAM role for GitHub Actions OIDC (see pomo repo `github_actions_role_arns` output)
- `TF_API_TOKEN` - Terraform Cloud API token (for sync workflow to read TFC outputs)

---

## Infrastructure Details

### Terraform Cloud

- **Organization**: Pitangaville
- **Workspace**: pomossr
- **Backend**: Terraform Cloud (state stored remotely)
- **VCS**: GitHub App integration (auto-triggers on push)

### Module Configuration

```hcl
module "ssr" {
  source  = "pomo-studio/serverless-ssr/aws"
  version = "~> 2.2"

  project_name    = "pomo-ssr"
  domain_name     = "pomo.dev"
  subdomain       = "ssr"    # Creates ssr.pomo.dev
  route53_managed = true     # Zone exists in pomo repo

  create_ci_cd_user = false  # Using GitHub Actions OIDC
}
```

### Domain Setup

The **ssr.pomo.dev** subdomain is managed by the [pomo](https://github.com/pomo-studio/pomo) repository:
- Route53 hosted zone for pomo.dev
- ACM certificates (us-east-1 for CloudFront)
- OIDC provider for GitHub Actions

This repo just uses the existing zone.

---

## Application Details

### Tech Stack

- **Runtime**: Nuxt 3.21 (Vue 3.5)
- **Platform**: AWS Lambda (Nitro `aws-lambda` preset)
- **State**: DynamoDB (visit counter, multi-region)
- **CDN**: CloudFront (global edge caching)

### Demo Features

- **Server-Side Rendering**: Real-time server clock
- **Multi-Region**: Shows serving region (us-east-1 or us-west-2)
- **Visit Counter**: Tracks total visits in DynamoDB
- **Weather API**: External API integration demo
- **Failover Testing**: Test CloudFront origin group failover

### API Endpoints

| Endpoint | Method | Description | Cache TTL |
|----------|--------|-------------|-----------|
| `/api/health` | GET | Health check for monitoring | 30s |
| `/api/counter` | POST | Increment visit counter | No cache |
| `/api/dashboard` | GET | Dashboard data | No cache |
| `/api/weather` | GET | Weather demo | 5min |

---

## Costs

Estimated monthly cost: **~$2/month**

| Resource | Cost |
|----------|------|
| Lambda invocations | $0.20 (1M free tier) |
| DynamoDB | $0.25 (on-demand) |
| CloudFront | $1.00 (1TB free tier) |
| S3 | $0.10 |
| Data transfer | $0.50 |

**Note**: Route53 zone and ACM certs are in the [pomo](https://github.com/pomo-studio/pomo) repo (~$0.50/month).

---

## Using as a Template

This repo is a living template — fork it to start a new SSR project:

1. **Fork** this repo on GitHub
2. **`infra/versions.tf`** — update `organization` and `workspace name` to your TFC org/workspace
3. **`infra/main.tf`** — update values marked `# ←`:
   - `project_name` — your project slug (used for all resource names)
   - `domain_name` / `subdomain` / `route53_managed` — your domain config
   - Remove `# optional` lines you don't need
4. **GitHub secrets** — set `AWS_ROLE_ARN` and `TF_API_TOKEN` on the new repo
5. **pomo repo** — add a GitHub Actions OIDC role for the new repo in `oidc.tf`

See [pomo/docs/NEW-SITE-CHECKLIST.md](https://github.com/pomo-studio/pomo/blob/main/docs/NEW-SITE-CHECKLIST.md) for the full step-by-step.

---

## Related Projects

| Repository | Purpose | Relationship |
|------------|---------|--------------|
| [pomo](https://github.com/pomo-studio/pomo) | Core DNS/ACM infrastructure | Creates `pomo.dev` zone + certs + OIDC |
| [terraform-aws-serverless-ssr](https://github.com/pomo-studio/terraform-aws-serverless-ssr) | Terraform module | Consumed by `infra/` |
| [pomo-dev](https://github.com/pomo-studio/pomo-dev) | Production website | Sister project using same pattern |

---

## Documentation

- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - Deployment workflow and TFC integration

---

## License

MIT

---

## Contact

- **Website**: [pomo.studio](https://pomo.studio)
- **Email**: contact@pomo.studio
- **GitHub**: [@apitanga](https://github.com/apitanga)
