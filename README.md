# Pomo SSR

A public application reference for [postmodern.tf](https://postmodern.tf): Nuxt
server-side rendering on AWS Lambda, with CloudFront delivery, S3 static assets,
and DynamoDB request counting.

[Live demo](https://ssr.pomo.dev) ·
[Terraform module](https://github.com/pomo-studio/terraform-aws-serverless-ssr) ·
[Getting started walkthrough](docs/GETTING-STARTED.md)

## Run It Locally

From the repository root:

```bash
npm --prefix app ci
npm --prefix app run dev
```

Open the local address printed by Nuxt. You can edit `app/pages/index.vue` and
see the page update without deploying AWS resources. Cloud-backed features such
as the request counter require infrastructure and appropriate credentials; local
rendering does not verify them.

## Deploy Your Own Copy

Follow the [getting-started walkthrough](docs/GETTING-STARTED.md).

It uses your own AWS sandbox, HCP Terraform workspace, and GitHub repository.
The first path uses a CloudFront hostname: no purchased domain, private Pomo
repository, or shared Pomo infrastructure is required.

The sequence is:

1. Fork the application and remove inherited deployment targets.
2. Configure your workspace and scoped workload identities.
3. Review and apply infrastructure in HCP Terraform.
4. Sync your outputs, deploy the application, and check its health response.
5. Make a first application change and follow it through deployment.

**Current status:** the walkthrough is source-reviewed and syntax-checked, not
yet deployment-verified in a fresh account. This is a sandbox learning path, not
a production starter. The guide records the remaining API and recovery
limitations.

Do not enable deployment on a fork with the original
`config/infra-outputs.json`: it identifies the existing Pomo deployment.

## How It Fits Together

| Location | Responsibility |
| --- | --- |
| `app/` | Nuxt pages and server API routes |
| `infra/` | Public SSR module pinned to `2.5.2`; infrastructure runs in HCP Terraform |
| `config/infra-outputs.json` | Deployment targets exported from infrastructure state |
| `scripts/deploy.sh` | Build, package, and publish application code and assets |
| `.github/workflows/` | Validation, output sync, and OIDC-based application deployment |

The architecture includes primary and DR resources. CloudFront page origin
failover is distinct from API and data recovery; deploying two regions does not
by itself verify application failover.

For an optional Route 53 custom domain, you supply an existing public hosted
zone. The SSR module creates the site's certificate, validation records, and
alias. The hostname-only walkthrough avoids that prerequisite entirely.

## Make A Change

Edit `app/pages/index.vue`, check it locally, then build the Lambda bundle:

```bash
NITRO_PRESET=aws-lambda npm --prefix app run build
```

Once your deployment is configured, pushing application changes to `main`
triggers deployment. Review the guide's first-change verification steps rather
than treating a successful build as proof of deployed behavior.

## Workflows

| Workflow | Purpose |
| --- | --- |
| `infra.yml` | Terraform formatting and validation; not an apply |
| `ci.yml` | Required typecheck, Lambda build, and credential-free handler tests |
| `sync-infra-config.yml` | Export full Terraform outputs and commit deployment configuration |
| `deploy.yml` | Publish the application using GitHub OIDC |

The sync workflow is not a post-apply hook. On first setup, wait for a successful
HCP Terraform apply before manually syncing, then manually deploy. Deployment
calls the reusable CI workflow and requires verification of the same commit
before assuming the AWS deployment role.

## Documentation

- [Getting Started](docs/GETTING-STARTED.md) — deploy your own copy from scratch
- [Infrastructure Setup](docs/infrastructure-setup.md) — module wiring and first apply
- [Deployment Guide](docs/deployment.md) — day-to-day application deployment
- [Operations](docs/OPERATIONS.md) — TFC/GitHub integration details for the existing Pomo setup
- [Caching Strategy](docs/CACHING.md) — CloudFront caching configuration

## License

MIT
