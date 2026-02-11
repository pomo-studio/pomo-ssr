# ============================================================
# Serverless SSR App — Infrastructure
# Replace placeholder values below before first apply.
# ============================================================

module "ssr" {
  source = "github.com/apitanga/serverless-ssr-module?ref=v2.2.0"

  providers = {
    aws.primary = aws.primary
    aws.dr      = aws.dr
  }

  # ── Required ──────────────────────────────────────────────
  project_name = "my-project" # e.g. "acme-web"

  # ── Domain (choose one scenario) ──────────────────────────
  # Scenario A: No custom domain (CloudFront URL only)
  # domain_name = null

  # Scenario B: Domain managed in Route53
  # domain_name     = "example.com"
  # route53_managed = true

  # Scenario C: External domain (manual DNS)
  # domain_name     = "example.com"
  # route53_managed = false

  domain_name     = null
  route53_managed = false

  # ── Optional ──────────────────────────────────────────────
  # subdomain       = "app"     # Creates app.example.com
  # enable_dynamo   = false     # Disable visit counter
  # enable_dr       = false     # Disable multi-region DR

  # Use GitHub Actions OIDC for deployments (no static IAM user)
  create_ci_cd_user = false

  tags = {
    Project   = "my-project"
    ManagedBy = "terraform"
  }
}
