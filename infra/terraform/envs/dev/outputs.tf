output "web_url" {
  value = module.web.uri
}

output "api_url" {
  value = module.api.uri
}

output "db_connection_name" {
  value = module.db.connection_name
}

output "gcs_bucket_name" {
  value = module.assets_bucket.name
}

output "artifact_registry_repository" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.this.repository_id}"
}
