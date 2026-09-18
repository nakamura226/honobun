variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "instance_name" {
  type = string
}

variable "database_version" {
  type    = string
  default = "POSTGRES_16"
}

variable "tier" {
  type        = string
  default     = "db-f1-micro"
  description = "dev用の最小構成。本番相当にする場合は変更する"
}

variable "database_name" {
  type    = string
  default = "honobun"
}

variable "db_user" {
  type    = string
  default = "honobun"
}

variable "deletion_protection" {
  type    = bool
  default = false
}

variable "backup_enabled" {
  type    = bool
  default = false
}
