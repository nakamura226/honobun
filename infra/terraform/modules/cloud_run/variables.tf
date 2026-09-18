variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "name" {
  type        = string
  description = "Cloud Run service name"
}

variable "image" {
  type        = string
  description = "Container image URL (e.g. Artifact Registry path)"
}

variable "port" {
  type    = number
  default = 8080
}

variable "cpu" {
  type    = string
  default = "1"
}

variable "memory" {
  type    = string
  default = "512Mi"
}

variable "min_instance_count" {
  type    = number
  default = 0
}

variable "max_instance_count" {
  type    = number
  default = 2
}

variable "allow_unauthenticated" {
  type        = bool
  default     = true
  description = "個人利用・公開想定のため、既定で誰でも呼び出し可能にする"
}

variable "service_account_email" {
  type    = string
  default = null
}

variable "env_vars" {
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "secret_env_vars" {
  type = list(object({
    name      = string
    secret_id = string
    version   = optional(string, "latest")
  }))
  default = []
}

variable "cloud_sql_instances" {
  type        = list(string)
  default     = []
  description = "Cloud SQL instance connection names (project:region:instance) to mount via the built-in Cloud SQL connector"
}

variable "deletion_protection" {
  type        = bool
  default     = false
  description = "dev環境ではterraform destroyでの削除を容易にするため既定でfalse"
}
