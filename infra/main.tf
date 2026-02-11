# Pomo SSR — Live demo at ssr.pomo.dev
# Also serves as the reference template for new SSR projects.
# When forking, replace values marked ← with your own.

module "ssr" {
  source = "github.com/apitanga/serverless-ssr-module?ref=v2.2.3"

  providers = {
    aws.primary = aws.primary
    aws.dr      = aws.dr
  }

  project_name = "pomo-ssr" # ← your project name, e.g. "acme-web"

  # Domain — choose one scenario:
  #   A) No custom domain:  domain_name = null, route53_managed = false
  #   B) Route53-managed:   domain_name = "example.com", route53_managed = true
  #   C) External DNS:      domain_name = "example.com", route53_managed = false
  domain_name     = "pomo.dev" # ← your root domain (or null)
  subdomain       = "ssr"      # ← your subdomain (omit for root domain)
  route53_managed = true       # ← true if zone is in Route53

  # Optional — disable features you don't need:
  # enable_dynamo   = false         # removes visit counter DynamoDB table
  # enable_dr       = false         # removes DR Lambda + S3 in us-west-2

  # Use GitHub Actions OIDC for deployments — no static IAM user needed
  create_ci_cd_user = false

  tags = {
    Project   = "pomo-ssr" # ← your project name
    ManagedBy = "terraform"
  }
}
