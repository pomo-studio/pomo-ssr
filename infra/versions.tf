# Terraform and Provider Versions

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Replace with your Terraform Cloud organization and workspace name.
  # Keep this block — the sync workflow needs it to read TFC outputs.
  cloud {
    organization = "your-tfc-org"
    workspaces {
      name = "your-workspace-name"
    }
  }
}
