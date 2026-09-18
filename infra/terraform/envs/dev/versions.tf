terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # 初期構築時はローカルstateとする。チーム開発に拡張する際はGCSバックエンドへ移行する:
  # backend "gcs" {
  #   bucket = "<state用に作成したバケット名>"
  #   prefix = "honobun/dev"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
