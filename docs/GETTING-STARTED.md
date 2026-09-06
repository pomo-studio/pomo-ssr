# Getting Started

Deploy your own copy of this Nuxt application using public repositories, an AWS
sandbox account, HCP Terraform (formerly Terraform Cloud, called TFC below), and
GitHub Actions. No access to the private `pomo` repository is required.

The first deployment uses an HTTPS `*.cloudfront.net` hostname. It keeps both
regions (`us-east-1` and `us-west-2`), S3 replication, and the DynamoDB global
table. You do not need a purchased domain, Route 53 hosted zone, or ACM certificate.

**Verification status:** this guide was checked against this repository's
infrastructure, workflows, deployment script, and cached public module version
`2.5.2`. No AWS bootstrap, TFC plan/apply, or application deployment was executed
while writing it. The IAM examples have not been integration-tested in a fresh
account. Read the limitations below before spending money.

Local verification on September 5, 2026: `npm ci` and `npm run build:lambda`
passed. A subsequent compatible lockfile update cleared the 37 reported
dependency advisories; full and production-only npm audits report zero known
advisories at review time. This is not a security certification.

## 1. Prerequisites And Safety

- Use an **isolated AWS sandbox account**, not an account containing production
  workloads. Have a federated console session authorized to create OIDC providers,
  IAM roles/policies, and service-linked roles. Set an AWS Budget and billing alerts;
  alerts are not a spending cap.
- Have a GitHub account allowed to fork repositories, configure Actions, create an
  environment, and manage repository secrets.
- Have a TFC organization with permission to create a project and VCS-connected
  workspace, configure variables, approve runs, and read workspace state.
- Install Git, Node.js/npm, `curl`, and `jq` for local development/verification.
  Actions installs its own tools. Local AWS credentials and local Terraform are
  **not required**. Optional local Terraform use is limited to `terraform fmt`.
- The CI and deploy workflows use Node.js 22, and module `2.5.2` uses Lambda
  `nodejs22.x`. This is a sandbox reference, not a recommendation to launch without
  your own review.
  changing your local Node version alone does not change Lambda's runtime.

Choose these values before starting. Replace uppercase placeholders in all JSON
examples; the AWS console does not interpolate them.

| Name | Meaning / example |
| --- | --- |
| `ACCOUNT_ID` | Your sandbox's 12-digit AWS account ID |
| `OWNER` / `REPO` | Your GitHub owner and repository, e.g. `your-team/acme-web` |
| `TFC_ORG` | Your TFC organization name, not its display label |
| `TFC_PROJECT` | Exact TFC project name, e.g. `sandbox` |
| `TFC_WORKSPACE` | Exact workspace name, e.g. `acme-web` |
| `acme-web` | Example resource prefix used throughout; replace consistently if different |

The TFC project name is separate from the Terraform module's `project_name`.
Use a unique resource prefix matching `^[a-z0-9][a-z0-9-]{2,19}$`: 3-20 lowercase
letters, digits, or hyphens, starting with a letter or digit. Examples assume the
standard AWS partition, not GovCloud or China.

## 2. Fork And Remove Inherited Targets

1. Fork [pomo-studio/pomo-ssr](https://github.com/pomo-studio/pomo-ssr) into your
   account. Keep `main` as the default branch. **Do not enable the fork's Actions
   workflows yet.** If already enabled, disable Actions in repository Settings
   before pushing changes. Do not add deployment secrets yet.
2. Clone your fork, then run the following from its repository root:

```bash
git remote -v
git rm config/infra-outputs.json
```

3. Delete any inherited repository/environment variable named `INFRA_OUTPUTS_JSON`
   in GitHub Settings. Check organization-level variables too. Do not copy
   `config/infra-outputs.example.json` over the deleted file; it is only an example.
4. Make the edits in the next section, then commit the deletion and edits together
   and push them to your fork's `main` while Actions is still disabled.

The deployment script trusts the committed config. It uploads code, updates
Lambda functions, and runs `aws s3 sync --delete`. A committed file takes precedence
over `INFRA_OUTPUTS_JSON`; merely setting a new variable does not make an inherited
file safe. Never use the upstream demo's account, buckets, distribution, workspace,
or role ARN. Keep `config/infra-outputs.example.json` so `config/` remains tracked.

## 3. Configure Your Infrastructure

Replace the module block in `infra/main.tf` with this, changing `acme-web` if needed:

```hcl
module "ssr" {
  source  = "pomo-studio/serverless-ssr/aws"
  version = "= 2.5.2"

  providers = {
    aws.primary = aws.primary
    aws.dr      = aws.dr
  }

  project_name      = "acme-web"
  environment       = "sandbox"
  primary_region    = var.primary_region
  dr_region         = var.dr_region
  domain_name       = null
  subdomain         = null
  route53_managed   = false
  enable_dr         = true
  enable_dynamo     = true
  create_ci_cd_user = false

  tags = {
    Project   = "acme-web"
    ManagedBy = "terraform"
  }
}
```

In `infra/versions.tf`, replace only the `cloud` block with your names. Retain the
Terraform/provider constraints and the committed `.terraform.lock.hcl`:

```hcl
cloud {
  organization = "TFC_ORG"
  workspaces {
    name = "TFC_WORKSPACE"
  }
}
```

Keep `infra/providers.tf` unchanged: both `aws.primary` and `aws.dr` specify only
an alias and a region. Keep `infra/variables.tf` and `infra/terraform.auto.tfvars`
at `us-east-1` / `us-west-2`. Passing the region variables into the module above
keeps its output metadata consistent with the providers.

Keep `infra/outputs.tf` unchanged, including `sensitive = true` on `app_config`.
The sync workflow uses authenticated `terraform output -json` in Actions, which
returns sensitive output values. It does **not** use the TFC outputs REST endpoint.
The pinned module's `app_config` contains resource identifiers, not credentials;
`create_ci_cd_user = false` avoids creating static access keys. Review future
output changes before allowing the sync workflow to publish them in Git.

Also replace the informational `Pitangaville/pomossr` notice in
`.github/workflows/infra.yml` with your organization/workspace. That message does
not configure TFC. If Terraform is installed, run `terraform fmt infra` to align
the HCL before committing; otherwise use your editor's formatter. Do not run
local `init`, `validate`, `plan`, `apply`, or state commands.

## 4. Bootstrap AWS In The Console

This one-time console bootstrap deliberately avoids needing a pre-existing
private infrastructure repository or local Terraform. Record the resources you
create; they are outside this application's TFC state and require separate cleanup.
For an organizational deployment, have your platform team own this bootstrap in
its approved infrastructure system instead.

### OIDC Providers And Trust

In **IAM > Identity providers > Add provider**, choose **OpenID Connect**. Create
these providers, or reuse existing providers with the exact URL and audience.
Do not replace an existing shared provider or remove its other audiences.

| Provider URL (no trailing slash) | Audience |
| --- | --- |
| `https://app.terraform.io` | `aws.workload.identity` |
| `https://token.actions.githubusercontent.com` | `sts.amazonaws.com` |

Use the console's certificate verification flow if prompted; do not paste an old
thumbprint from a blog post. These instructions target `app.terraform.io`, not
a Terraform Enterprise or regional HCP Terraform hostname.

In **IAM > Roles > Create role > Custom trust policy**, create
`tfc-acme-web` with this trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/app.terraform.io"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "app.terraform.io:aud": "aws.workload.identity",
        "app.terraform.io:sub": [
          "organization:TFC_ORG:project:TFC_PROJECT:workspace:TFC_WORKSPACE:run_phase:plan",
          "organization:TFC_ORG:project:TFC_PROJECT:workspace:TFC_WORKSPACE:run_phase:apply"
        ]
      }
    }
  }]
}
```

Create a second role, `github-acme-web-deploy`, with this trust policy. Leave its
permissions empty until the infrastructure outputs are available:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        "token.actions.githubusercontent.com:sub": "repo:OWNER/REPO:environment:production"
      }
    }
  }]
}
```

The deploy job declares `environment: production`, so its subject is **not**
`repo:OWNER/REPO:ref:refs/heads/main`. In GitHub **Settings > Environments**, create
`production`, restrict deployment branches to `main`, and add required reviewers
where your GitHub plan supports them. The environment restriction is what limits
the branch when using this trust subject. Do not wildcard the repository or trust
pull-request subjects. These examples assume GitHub's default OIDC subject format.

### TFC Provisioning Permissions

Prefer a platform-approved provisioning policy. **PowerUserAccess alone is not
sufficient**: it omits general IAM role/policy management and `iam:PassRole`, while
this module creates a Lambda execution role, an S3 replication role, and managed
policies/attachments. Do not solve this by attaching `AdministratorAccess` or by
giving the GitHub deploy role infrastructure permissions.

For a disposable, isolated sandbox, the following is an explicit bounded starting
policy. In `tfc-acme-web` choose **Permissions > Add permissions > Create inline
policy > JSON**, substitute `ACCOUNT_ID` and your resource prefix, and name it
`ProvisionAcmeWebSandbox`. Attach it instead of PowerUserAccess.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ProjectBuckets",
      "Effect": "Allow",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::acme-web-lambda-deployments-ACCOUNT_ID-us-east-1",
        "arn:aws:s3:::acme-web-lambda-deployments-ACCOUNT_ID-us-east-1/*",
        "arn:aws:s3:::acme-web-lambda-deployments-ACCOUNT_ID-us-west-2",
        "arn:aws:s3:::acme-web-lambda-deployments-ACCOUNT_ID-us-west-2/*",
        "arn:aws:s3:::acme-web-static-ACCOUNT_ID",
        "arn:aws:s3:::acme-web-static-ACCOUNT_ID/*",
        "arn:aws:s3:::acme-web-static-ACCOUNT_ID-dr",
        "arn:aws:s3:::acme-web-static-ACCOUNT_ID-dr/*"
      ]
    },
    {
      "Sid": "ProjectFunctionsAndTable",
      "Effect": "Allow",
      "Action": ["lambda:*", "dynamodb:*"],
      "Resource": [
        "arn:aws:lambda:us-east-1:ACCOUNT_ID:function:acme-web-primary",
        "arn:aws:lambda:us-east-1:ACCOUNT_ID:function:acme-web-primary:*",
        "arn:aws:lambda:us-west-2:ACCOUNT_ID:function:acme-web-dr",
        "arn:aws:lambda:us-west-2:ACCOUNT_ID:function:acme-web-dr:*",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/acme-web-visits",
        "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/acme-web-visits/*",
        "arn:aws:dynamodb:us-west-2:ACCOUNT_ID:table/acme-web-visits",
        "arn:aws:dynamodb:us-west-2:ACCOUNT_ID:table/acme-web-visits/*"
      ]
    },
    {
      "Sid": "DescribeRegionalDynamoDBKeys",
      "Effect": "Allow",
      "Action": "kms:DescribeKey",
      "Resource": [
        "arn:aws:kms:us-east-1:ACCOUNT_ID:key/*",
        "arn:aws:kms:us-west-2:ACCOUNT_ID:key/*"
      ]
    },
    {
      "Sid": "CloudFrontSandboxControlPlane",
      "Effect": "Allow",
      "Action": "cloudfront:*",
      "Resource": "*"
    },
    {
      "Sid": "ProjectRoleLifecycle",
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole", "iam:GetRole", "iam:UpdateRole",
        "iam:UpdateAssumeRolePolicy", "iam:DeleteRole",
        "iam:TagRole", "iam:UntagRole", "iam:ListRoleTags",
        "iam:ListRolePolicies", "iam:GetRolePolicy", "iam:ListAttachedRolePolicies",
        "iam:ListInstanceProfilesForRole"
      ],
      "Resource": [
        "arn:aws:iam::ACCOUNT_ID:role/acme-web-lambda-role",
        "arn:aws:iam::ACCOUNT_ID:role/acme-web-s3-replication-role"
      ]
    },
    {
      "Sid": "ProjectPolicyLifecycle",
      "Effect": "Allow",
      "Action": [
        "iam:CreatePolicy", "iam:GetPolicy", "iam:GetPolicyVersion",
        "iam:CreatePolicyVersion", "iam:DeletePolicyVersion",
        "iam:ListPolicyVersions", "iam:SetDefaultPolicyVersion",
        "iam:DeletePolicy", "iam:TagPolicy", "iam:UntagPolicy", "iam:ListPolicyTags"
      ],
      "Resource": [
        "arn:aws:iam::ACCOUNT_ID:policy/acme-web-dynamodb-policy",
        "arn:aws:iam::ACCOUNT_ID:policy/acme-web-s3-policy",
        "arn:aws:iam::ACCOUNT_ID:policy/acme-web-s3-replication-policy"
      ]
    },
    {
      "Sid": "ApprovedAttachments",
      "Effect": "Allow",
      "Action": ["iam:AttachRolePolicy", "iam:DetachRolePolicy"],
      "Resource": [
        "arn:aws:iam::ACCOUNT_ID:role/acme-web-lambda-role",
        "arn:aws:iam::ACCOUNT_ID:role/acme-web-s3-replication-role"
      ],
      "Condition": {
        "ArnEquals": {
          "iam:PolicyARN": [
            "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
            "arn:aws:iam::ACCOUNT_ID:policy/acme-web-dynamodb-policy",
            "arn:aws:iam::ACCOUNT_ID:policy/acme-web-s3-policy",
            "arn:aws:iam::ACCOUNT_ID:policy/acme-web-s3-replication-policy"
          ]
        }
      }
    },
    {
      "Sid": "PassLambdaRole",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::ACCOUNT_ID:role/acme-web-lambda-role",
      "Condition": {"StringEquals": {"iam:PassedToService": "lambda.amazonaws.com"}}
    },
    {
      "Sid": "PassReplicationRole",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "arn:aws:iam::ACCOUNT_ID:role/acme-web-s3-replication-role",
      "Condition": {"StringEquals": {"iam:PassedToService": "s3.amazonaws.com"}}
    },
    {
      "Sid": "DynamoDBServiceLinkedRoles",
      "Effect": "Allow",
      "Action": "iam:CreateServiceLinkedRole",
      "Resource": "arn:aws:iam::ACCOUNT_ID:role/aws-service-role/*",
      "Condition": {
        "StringEquals": {
          "iam:AWSServiceName": ["dynamodb.amazonaws.com", "replication.dynamodb.amazonaws.com"]
        }
      }
    }
  ]
}
```

The AWS provider directly calls `kms:DescribeKey` to look up the AWS-managed
DynamoDB key in each region. Authorization must target **key ARNs**, not
`alias/aws/dynamodb` ARNs, and must not require `kms:ViaService`: this lookup is
made by the provider, not through DynamoDB. The regional `key/*` scope permits
metadata lookup only, not encryption/decryption. Once the keys exist, find
`aws/dynamodb` under **KMS > AWS managed keys** in each region and optionally
replace the wildcards with those exact key ARNs.

No ACM or Route 53 permissions are needed. Runtime log writes use the module's
`AWSLambdaBasicExecutionRole` attachment; log groups are not Terraform-managed.
STS `GetCallerIdentity` needs no allow.

**This is not production least privilege.** Service wildcards are intentionally
used on named resources; CloudFront is account-wide because it creates several
types of resources with generated IDs and global control-plane operations. Most
importantly, permission to edit and pass execution-role policies can enable
privilege escalation through Lambda. Name scoping does not bound policy contents.
The module does not expose a permissions-boundary input for these roles. Use
account isolation/SCPs and platform review; a production boundary design needs
module changes. If an SCP, permission boundary, quota, or provider API rejects a
run, inspect the exact denied action/resource in TFC and CloudTrail with your
administrator rather than adding account-wide admin access.

## 5. Create The TFC Workspace

In the TFC UI create your organization/project as needed, then create a
**Version control workflow** workspace. Install/authorize the TFC GitHub App for
your fork, not the upstream repository.

| Setting | Value |
| --- | --- |
| Workspace name / project | Exactly `TFC_WORKSPACE` / `TFC_PROJECT` from the trust policy |
| Repository / branch | `OWNER/REPO`, `main` |
| Terraform working directory | `infra` |
| Execution mode | Remote (TFC-hosted execution) |
| Terraform version | A supported stable version satisfying `>= 1.5.0` |
| Auto apply | Disabled; manual approval required |
| VCS run triggers | Only changes under `infra/` (path/pattern relative to repository root, e.g. `infra/**`) |

Create the following **Environment** variables under workspace Variables, not
Terraform-category variables. They are configuration, not AWS access keys:

| Variable | Value |
| --- | --- |
| `TFC_AWS_PROVIDER_AUTH` | `true` |
| `TFC_AWS_RUN_ROLE_ARN` | `arn:aws:iam::ACCOUNT_ID:role/tfc-acme-web` |
| `TFC_AWS_WORKLOAD_IDENTITY_AUDIENCE` | `aws.workload.identity` |

Both providers use the **same account and role**, differing only by region. The
untagged credential configuration is shared through the AWS provider credential
chain by `aws.primary` and `aws.dr`; aliases do not automatically require separate
credentials. The locked AWS provider is `5.100.0` (`~> 5.0`), compatible with this
OIDC approach. Do not set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
`AWS_SESSION_TOKEN`, `AWS_PROFILE`, or explicit provider credentials. Check
inherited variable sets for conflicts too.

Do not just add `TFC_AWS_RUN_ROLE_ARN_primary` / `_dr`: independent tagged
credentials require a `tfc_aws_dynamic_credentials` Terraform variable and explicit
`shared_config_files` mapping in each provider. The current providers have neither
and do not need them for this single-account route. See HashiCorp's
[AWS dynamic credentials configuration](https://developer.hashicorp.com/terraform/cloud-docs/dynamic-provider-credentials/aws-configuration).

Discard any initial run queued before the variables were ready. Queue a new
**Plan and apply** run from the current `main` commit in the TFC UI. Review the
plan and confirm your account, prefix, regions, no custom domain/DNS resources,
both Lambdas, four buckets, and the DynamoDB table plus replica. A fresh workspace
must not propose deleting or updating someone else's resources. Approve manually
only after review, then wait for status **Applied** and CloudFront deployment.
Allow tens of minutes, not a guaranteed five-minute setup.

Infrastructure initially installs a bootstrap Lambda, not the Nuxt app. Its
`/api/health` returns `status: "bootstrap"`; HTTP 200 alone does not prove the app
was deployed. If apply fails partway, retain the workspace/state and fix or destroy
through TFC. Do not delete the workspace to retry from scratch.

## 6. Sync Outputs After Apply

1. Create a TFC API token for a dedicated team with access to read this workspace
   and **read its state/outputs**, including sensitive outputs. Use workspace-scoped
   access where your TFC plan supports it. Otherwise use a short-lived user token
   from a user with the necessary access, understanding it inherits that user's
   wider permissions. Do not grant apply/admin just for sync.
2. Add it through GitHub **Settings > Secrets and variables > Actions > Repository
   secrets** as `TF_API_TOKEN`. Never paste the token into Git, commands, or logs.
3. Confirm the inherited config deletion and new TFC names are on `main`, then
   enable Actions. Under **Actions > General > Workflow permissions**, permit the
   sync workflow's `contents: write` use. It pushes directly to `main`; branch
   protection/rulesets must permit this bot push. If your platform forbids it, stop:
   the existing sync workflow needs a reviewed PR-based change before it can work.
4. In **Actions > Sync Infrastructure Config > Run workflow**, select `main`.
   Wait for success and inspect its `chore: sync infra outputs [skip ci]` commit.
   Do not run Deploy yet.
5. Pull that commit locally and inspect the config:

```bash
git pull --ff-only
jq '.app_config.value | {
  project_name, primary_region, dr_region, lambda, static_assets, cloudfront, dynamodb
}' config/infra-outputs.json
jq -r '.application_url.value' config/infra-outputs.json
```

Verify every resource belongs to your sandbox: primary/DR function names, both
deployment bucket names, primary static bucket, distribution ID, table name, and
the new CloudFront hostname. The file must have Terraform's output envelope,
e.g. `.app_config.value.lambda.primary.function_name`, not just a raw `app_config`
object. Reject `null` values for either region or DynamoDB on this route.

**Ordering hazard:** `Infrastructure` only formats/validates Terraform. Its success
automatically triggers sync, but does not mean TFC has applied anything. TFC's VCS
run is independent. Sync can therefore fail before the first state exists or copy
old outputs. Always manually sync after the intended TFC run is **Applied**.
Sync never applies infrastructure; its remote-state `terraform init` and
`terraform output -json` run in Actions, not on your laptop.

## 7. Grant Deployment Permissions

Use the now-reviewed output values to fill the placeholders below. In the AWS
console add this inline policy to `github-acme-web-deploy`:

| Placeholder | Source in `config/infra-outputs.json` |
| --- | --- |
| `PRIMARY_FUNCTION` | `.app_config.value.lambda.primary.function_name` |
| `DR_FUNCTION` | `.app_config.value.lambda.dr.function_name` |
| `PRIMARY_DEPLOY_BUCKET` | `.app_config.value.lambda.primary.s3_bucket` |
| `DR_DEPLOY_BUCKET` | `.app_config.value.lambda.dr.s3_bucket` |
| `STATIC_BUCKET` | `.app_config.value.static_assets.s3_bucket` |
| `DISTRIBUTION_ID` | `.app_config.value.cloudfront.distribution_id` |

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "UploadDeploymentPackages",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:AbortMultipartUpload"],
      "Resource": [
        "arn:aws:s3:::PRIMARY_DEPLOY_BUCKET/lambda/function.zip",
        "arn:aws:s3:::DR_DEPLOY_BUCKET/lambda/function.zip"
      ]
    },
    {
      "Sid": "BucketLocations",
      "Effect": "Allow",
      "Action": "s3:GetBucketLocation",
      "Resource": [
        "arn:aws:s3:::PRIMARY_DEPLOY_BUCKET",
        "arn:aws:s3:::DR_DEPLOY_BUCKET",
        "arn:aws:s3:::STATIC_BUCKET"
      ]
    },
    {
      "Sid": "ListStaticAssets",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::STATIC_BUCKET"
    },
    {
      "Sid": "SyncStaticAssets",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:AbortMultipartUpload"],
      "Resource": "arn:aws:s3:::STATIC_BUCKET/*"
    },
    {
      "Sid": "UpdateBothFunctions",
      "Effect": "Allow",
      "Action": "lambda:UpdateFunctionCode",
      "Resource": [
        "arn:aws:lambda:us-east-1:ACCOUNT_ID:function:PRIMARY_FUNCTION",
        "arn:aws:lambda:us-west-2:ACCOUNT_ID:function:DR_FUNCTION"
      ]
    },
    {
      "Sid": "InvalidateOwnDistribution",
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
    }
  ]
}
```

This matches `scripts/deploy.sh`: upload two packages, update both functions with
`--publish` (part of `UpdateFunctionCode`, not a separate `PublishVersion` call),
sync/delete primary static objects, and invalidate CloudFront. S3 replicates
static assets to DR using its own role. Deployment needs no DynamoDB access,
`iam:PassRole`, IAM administration, or AWS static keys. Customer-managed KMS keys
are not configured by this walkthrough; adding them requires additional policies.

Add the deployment role ARN as the **repository secret** `AWS_ROLE_ARN`. An
environment-only secret is insufficient: `check-config` reads it in a job without
an environment and would skip deployment. The actual deploy job uses `production`
and its protections. Keep `TF_API_TOKEN` at repository scope for the same reason.
The role ARN is an identifier, not an access key, despite the workflow's secret
storage requirement. Do not set `INFRA_OUTPUTS_JSON` for this committed-file route.

## 8. Deploy And Verify

In **Actions > Deploy > Run workflow**, select branch `main` and environment
`production`. Approve any environment review. Check that **Deploy to AWS** ran,
not merely **Notify Skipped**, and that the logged STS account is your sandbox.
No app deployment is triggered by the config-only sync commit; the explicit first
Deploy dispatch is required.

From the repository root after pulling the sync commit:

```bash
URL=$(jq -er '.application_url.value' config/infra-outputs.json)
curl --fail --silent --show-error "$URL/api/health" | jq .
curl --fail --silent --show-error "$URL/api/health" |
  jq -e '.status == "healthy" and .region == "us-east-1" and .version == "1.0.0"'
```

Expected application JSON from `app/server/api/health.get.ts` (timestamp varies):

```json
{
  "status": "healthy",
  "region": "us-east-1",
  "timestamp": "2026-09-05T12:00:00.000Z",
  "version": "1.0.0"
}
```

The workflow smoke test checks only HTTP success and can pass against bootstrap
code. The JSON check distinguishes the real application, but does not test
DynamoDB or DR. Open `$URL` in a browser and verify the page and `/_nuxt/` assets.
Check the SSR render endpoint; it also exercises DynamoDB by incrementing a
request counter on every request:

```bash
curl --fail --silent --show-error "$URL/api/render" |
  jq -e '(.renderMode == "server-side") and (.counter | type == "number")'
```

`api/render` returns fallback data on database errors, so check the JSON too.

In AWS Console verify both Lambda code updates completed, S3 replication is
configured, and the DynamoDB replica is Active in `us-west-2`. Replication is
asynchronous; this is not proof of recovery time or full application failover.
Direct unsigned Lambda Function URL requests should be denied; use CloudFront,
not a change to `authorization_type = "NONE"`, to access the app.

## 9. First Local Edit And Change Cycle

Local UI/health work needs no AWS credentials. From the repository root:

```bash
npm --prefix app install
npm --prefix app run dev
```

Open `http://localhost:3000`. Edit the label in `app/pages/index.vue` from
`Live infrastructure proof` to `My sandbox SSR application`, confirm hot reload,
then stop the dev server and check the Lambda build:

```bash
NITRO_PRESET=aws-lambda npm --prefix app run build
git diff -- app/pages/index.vue
git status --short
```

Locally `/api/health` reports `region: "unknown"` unless an AWS region is set.
The `/api/render` endpoint still calls DynamoDB, not an emulator. Without
credentials expect fallback data/errors; do not export production credentials just
to preview the UI. If you deliberately test with sandbox SSO, set `DYNAMODB_TABLE`
to your own output table before starting dev; the source default is `pomo-ssr-visits`.

Commit only intended source/dependency changes, open a PR, and merge after review.
App or script changes pushed to `main` automatically run Deploy. Deployment
requires reusable CI to typecheck, build, and test the same commit before AWS
credentials are assumed. Keep environment approval for release review. The deploy
script builds again with `npm ci`; it does not deploy CI's artifact.

For an infrastructure change, keep app changes in a separate merge: push the
infra change, inspect/approve the TFC run, wait for **Applied**, manually sync,
review new targets, update the deploy IAM policy if resource IDs changed, then
manually Deploy. Do not rely on the validation-triggered sync to serialize this.
Infrastructure apply may restore the bootstrap S3 object at the same key used by
deployment, and the Terraform-managed counter seed can drift after app writes;
review object/item changes for resets rather than approving blindly.

The deploy script invalidates `/_nuxt/*`, `/favicon.ico`, and `/*.html`, not `/`
or arbitrary Nuxt routes. Wait for route cache expiry when checking page edits;
if needed create a targeted invalidation for `/` in your CloudFront console.
It also does not wait for Lambda update completion or invalidation completion.
Inspect Lambda status and CloudFront invalidations before treating a short smoke
test timeout as a code defect, and avoid overlapping deployments.

## Costs And Cleanup

Do not treat this as a fixed "$2/month" stack. There are two Lambda functions,
four versioned buckets, cross-region S3 replication/transfer, a DynamoDB table
plus replica, CloudFront traffic, and runtime-created CloudWatch logs. Low-traffic
sandboxes may cost a few dollars per month, but traffic, polling, replicated
writes, stored versions, logs, and free-tier eligibility can change that sharply.
Published Lambda versions also accumulate against code-storage quotas. Include
GitHub Actions minutes and your TFC plan's resource/run pricing. Use the AWS
Pricing Calculator and Cost Explorer for your regions; review actual bills early.
This path has no Route 53 zone, DNS health checks, NAT gateway, or load balancer.

To stop charges, destroying the workspace's infrastructure is necessary; disabling
Actions alone leaves resources live.

1. Disable Deploy and Sync workflows and stop merging changes. Cancel queued
   deployments/TFC runs. Keep the TFC role, trust, variables, and state until
   destruction completes. Export any data you need to retain.
2. In AWS S3 Console, identify **all four buckets from your TFC state** and empty
   them. They are versioned: remove all versions and delete markers, not just
   visible objects. Stop writes, allow replication to settle, and empty/check DR
   again. Console cleanup requires your operator's permissions, not the deploy
   role. The module does not set `force_destroy`.
3. In TFC workspace **Settings > Destruction and Deletion**, queue a destroy plan.
   Review that it targets only your sandbox resources, then manually approve.
   CloudFront disable/delete and DynamoDB replica removal can take time. If
   nonempty buckets block destroy, empty the remaining versions in the console
   and retry the destroy run through TFC. Do not delete state or run local destroy.
4. Confirm the destroy run succeeded and the state has no managed resources.
   Check both AWS regions. Delete runtime-created `/aws/lambda/acme-web-primary`
   and `/aws/lambda/acme-web-dr` log groups separately if no longer needed; they
   are not managed by the module and may have no retention limit.
5. Remove GitHub `AWS_ROLE_ARN` / `TF_API_TOKEN`, revoke the TFC token, and remove
   the generated config with `git rm config/infra-outputs.json` in your fork.
   Delete the two bootstrap IAM roles and their inline policies in AWS. Delete
   OIDC providers only if you created them and no other workloads use them;
   service-linked roles may also be shared and should not be removed blindly.
6. Only then delete the TFC workspace if desired, retaining state/audit records
   according to your policy. Recheck billing for residual storage and logs.

## Limits And Troubleshooting

- **Runtime blocked:** the pinned module has no runtime input. Use a reviewed
  module/runtime upgrade, not a console drift fix; see the prerequisite warning.
- **DR scope:** CloudFront fails over eligible SSR/static requests on configured
  errors, but `/api/*` routes directly to primary. The Lambda DynamoDB policy in
  the pinned module covers only the primary table ARN even though the app selects
  its local region. Full DR data access needs a module fix. The UI's test button
  and primary health success are not an end-to-end disaster-recovery test.
- **OIDC denied:** check provider audience, exact organization/project/workspace
  or repository/environment subject, and inherited TFC variables. Renaming a TFC
  project/workspace or GitHub repository requires updating trust. A GitHub branch
  subject will not match this environment-based deployment.
- **Sync failed/stale:** confirm the intended TFC run is Applied, token can read
  state, cloud block names match, and the bot can push to `main`. Rerun Sync after
  apply. Never fill missing values with upstream example resource identifiers.
- **Deploy skipped:** `AWS_ROLE_ARN` must be a repository secret, and the committed
  config must exist on the selected ref. A green workflow with a skipped deploy
  is not a deployment.
- **403/500 or counter errors:** inspect CloudFront behavior and both Lambda log
  groups, resource permissions, and actual table name. Keep OAC and IAM URL auth.
  Account-level S3 controls/SCPs can also conflict with this module's bucket-level
  public-access-block settings; do not weaken organization controls to pass a demo.
- **Custom domain later:** this sandbox provisioning policy intentionally excludes
  ACM/Route 53. Adding a domain requires a separately reviewed DNS/certificate
  permission expansion and configuration, outside this first deployment.

## TL;DR

1. Fork `pomo-studio/pomo-ssr`, delete inherited `config/infra-outputs.json`, and keep Actions disabled.
2. Replace the module block in `infra/main.tf` with your project name and `domain_name = null`.
3. Update `infra/versions.tf` with your HCP Terraform organization and workspace.
4. Create OIDC providers and two scoped IAM roles in AWS for HCP Terraform and GitHub Actions.
5. Attach the bounded inline provisioning policy to the HCP Terraform role.
6. Create a VCS-connected HCP Terraform workspace for the `infra/` directory with dynamic AWS credentials.
7. Review and apply the Terraform plan, then sync the outputs to `config/infra-outputs.json`.
8. Add the scoped deployment policy to the GitHub Actions role and set `AWS_ROLE_ARN` as a repository secret.
9. Run the Deploy workflow and verify `/api/health` and `/api/render` on your CloudFront URL.
10. Make a local change, merge it, and tear down the workspace through TFC when you are done.
