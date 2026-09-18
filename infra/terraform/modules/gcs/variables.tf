variable "project_id" {
  type = string
}

variable "name" {
  type        = string
  description = "グローバルに一意なバケット名"
}

variable "location" {
  type    = string
  default = "ASIA-NORTHEAST1"
}

variable "storage_class" {
  type    = string
  default = "STANDARD"
}

variable "force_destroy" {
  type    = bool
  default = true
}

variable "cors_origins" {
  type    = list(string)
  default = ["*"]
}
