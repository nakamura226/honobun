output "connection_name" {
  value = google_sql_database_instance.this.connection_name
}

output "database_name" {
  value = google_sql_database.this.name
}

output "db_user" {
  value = google_sql_user.this.name
}

output "db_password" {
  value     = random_password.db_user.result
  sensitive = true
}
