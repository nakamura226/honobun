resource "google_sql_database_instance" "this" {
  name             = var.instance_name
  project          = var.project_id
  region           = var.region
  database_version = var.database_version

  settings {
    tier              = var.tier
    edition           = var.edition
    availability_type = "ZONAL"
    disk_autoresize   = true

    # Cloud Run組み込みのCloud SQLコネクタ経由で接続するため、Public IPを有効にする
    ip_configuration {
      ipv4_enabled = true
    }

    backup_configuration {
      enabled = var.backup_enabled
    }
  }

  deletion_protection = var.deletion_protection
}

resource "google_sql_database" "this" {
  name     = var.database_name
  project  = var.project_id
  instance = google_sql_database_instance.this.name
}

resource "random_password" "db_user" {
  length  = 24
  special = false
}

resource "google_sql_user" "this" {
  project  = var.project_id
  instance = google_sql_database_instance.this.name
  name     = var.db_user
  password = random_password.db_user.result
}
