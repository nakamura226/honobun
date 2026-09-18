locals {
  env           = "dev"
  api_name      = "honobun-api-${local.env}"
  web_name      = "honobun-web-${local.env}"
  bucket_name   = "${var.project_id}-honobun-${local.env}-assets"
  repository_id = "honobun"
}

resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "storage.googleapis.com",
    "secretmanager.googleapis.com",
    "artifactregistry.googleapis.com",
  ])

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "this" {
  project       = var.project_id
  location      = var.region
  repository_id = local.repository_id
  format        = "DOCKER"

  depends_on = [google_project_service.apis]
}

# --- Cloud SQL (PostgreSQL) ---

module "db" {
  source = "../../modules/cloud_sql"

  project_id          = var.project_id
  region              = var.region
  instance_name       = "honobun-${local.env}"
  tier                = var.db_tier
  deletion_protection = var.db_deletion_protection

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret" "database_url" {
  project   = var.project_id
  secret_id = "honobun-${local.env}-database-url"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "database_url" {
  secret = google_secret_manager_secret.database_url.id
  secret_data = join("", [
    "postgresql://", module.db.db_user, ":", module.db.db_password,
    "@/", module.db.database_name,
    "?host=/cloudsql/", module.db.connection_name,
  ])
}

# --- LLM APIキー(値は tfvars で渡された場合のみバージョンを作成) ---

resource "google_secret_manager_secret" "llm_keys" {
  for_each = toset(["anthropic-api-key", "openai-api-key", "google-generative-ai-api-key"])

  project   = var.project_id
  secret_id = "honobun-${local.env}-${each.value}"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "anthropic_api_key" {
  count       = var.anthropic_api_key != "" ? 1 : 0
  secret      = google_secret_manager_secret.llm_keys["anthropic-api-key"].id
  secret_data = var.anthropic_api_key
}

resource "google_secret_manager_secret_version" "openai_api_key" {
  count       = var.openai_api_key != "" ? 1 : 0
  secret      = google_secret_manager_secret.llm_keys["openai-api-key"].id
  secret_data = var.openai_api_key
}

resource "google_secret_manager_secret_version" "google_generative_ai_api_key" {
  count       = var.google_generative_ai_api_key != "" ? 1 : 0
  secret      = google_secret_manager_secret.llm_keys["google-generative-ai-api-key"].id
  secret_data = var.google_generative_ai_api_key
}

# --- api用サービスアカウント ---

resource "google_service_account" "api" {
  project      = var.project_id
  account_id   = "honobun-api-${local.env}"
  display_name = "honobun api (${local.env})"
}

resource "google_project_iam_member" "api_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_secret_manager_secret_iam_member" "api_database_url" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.database_url.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api.email}"
}

resource "google_secret_manager_secret_iam_member" "api_llm_keys" {
  for_each = google_secret_manager_secret.llm_keys

  project   = var.project_id
  secret_id = each.value.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api.email}"
}

# --- Cloud Run ---

module "api" {
  source = "../../modules/cloud_run"

  project_id            = var.project_id
  region                = var.region
  name                  = local.api_name
  image                 = var.api_image
  port                  = 8080
  service_account_email = google_service_account.api.email
  cloud_sql_instances   = [module.db.connection_name]

  env_vars = [
    { name = "PORT", value = "8080" },
    # 個人利用・認証なしのdev環境のため、CORSは全オリジン許可とする
    { name = "WEB_ORIGIN", value = "*" },
  ]

  secret_env_vars = [
    { name = "DATABASE_URL", secret_id = google_secret_manager_secret.database_url.secret_id },
    { name = "ANTHROPIC_API_KEY", secret_id = google_secret_manager_secret.llm_keys["anthropic-api-key"].secret_id },
    { name = "OPENAI_API_KEY", secret_id = google_secret_manager_secret.llm_keys["openai-api-key"].secret_id },
    { name = "GOOGLE_GENERATIVE_AI_API_KEY", secret_id = google_secret_manager_secret.llm_keys["google-generative-ai-api-key"].secret_id },
  ]

  depends_on = [google_project_service.apis]
}

module "web" {
  source = "../../modules/cloud_run"

  project_id = var.project_id
  region     = var.region
  name       = local.web_name
  image      = var.web_image
  port       = 3000

  env_vars = [
    { name = "NEXT_PUBLIC_API_URL", value = module.api.uri },
  ]

  depends_on = [google_project_service.apis]
}

# --- GCS ---

module "assets_bucket" {
  source = "../../modules/gcs"

  project_id = var.project_id
  name       = local.bucket_name
  location   = upper(var.region)

  depends_on = [google_project_service.apis]
}
