variable "project_id" {
  type        = string
  description = "GCPプロジェクトID"
}

variable "region" {
  type    = string
  default = "asia-northeast1"
}

variable "api_image" {
  type        = string
  description = "apps/api のコンテナイメージ (Artifact Registryのパス)"
}

variable "web_image" {
  type        = string
  description = "apps/web のコンテナイメージ (Artifact Registryのパス)"
}

variable "db_tier" {
  type    = string
  default = "db-f1-micro"
}

variable "db_deletion_protection" {
  type    = bool
  default = false
}

variable "anthropic_api_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "openai_api_key" {
  type      = string
  default   = ""
  sensitive = true
}

variable "google_generative_ai_api_key" {
  type      = string
  default   = ""
  sensitive = true
}
