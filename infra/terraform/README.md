# infra/terraform

GCP上のdev環境をTerraformで構築する。

## 構成

```
infra/terraform/
├── modules/
│   ├── cloud_run/   # Cloud Run v2 サービス(web/api共通)
│   ├── cloud_sql/   # Cloud SQL for PostgreSQL
│   └── gcs/         # GCS バケット
└── envs/
    └── dev/         # dev環境のルート構成 (staging/prodは同様の構成で追加予定)
```

## 前提

- gcloud CLI でログイン済み、対象プロジェクトに対する権限があること
- Terraform >= 1.5
- `apps/api` / `apps/web` のコンテナイメージをビルド・Artifact Registryへpushしていること
  (初回applyだけなら任意の公開イメージで一旦通し、後から `gcloud run deploy` で差し替えても良い)

## 使い方

```bash
cd infra/terraform/envs/dev
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars を編集 (project_id, イメージパス, APIキー等)

terraform init
terraform plan
terraform apply
```

## 設計上の決定事項

- **Cloud SQL接続方式**: Cloud SQL Auth Proxyをサイドカーとして自前で動かすのではなく、
  Cloud Run v2組み込みのCloud SQLコネクタ(`volumes { cloud_sql_instance {...} }`)を使用する。
  dev環境ではCloud SQLのPublic IPを有効にし、Cloud Runコネクタ経由で接続する。
  接続文字列はSecret Manager経由で `DATABASE_URL` としてapiコンテナに注入する。
- **CORS**: web→apiの相互URL参照によるTerraformの循環依存を避けるため、
  dev環境ではapi側のCORS許可オリジンを `*` (全許可) としている。
  個人利用・認証機能なしの想定のためリスクは限定的だが、
  ユーザーを跨ぐ認証情報を扱うようになった場合は要見直し。
- **画像アップロード(GCS)**: apiサービスアカウントに `roles/iam.serviceAccountTokenCreator`(自分自身に対して)を付与し、
  サービスアカウントキーを発行せずに署名付きURL(アップロード/ダウンロード)を発行できるようにしている。
  加えて `roles/storage.objectAdmin` をassetsバケットに対して付与する。
- **state管理**: 初期構築時はローカルstate。チーム開発へ拡張する際は
  `envs/dev/versions.tf` のGCSバックエンド設定を有効化する。
- **環境拡張**: staging/prodは `envs/dev` と同様の構成を
  `envs/staging` 等として追加することを想定している(モジュールは共通で再利用可能)。

## 未確定事項

- Cloud SQLの機械種別(`db_tier`)やバックアップ設定は開発用の最小構成。本番相当にする場合は要見直し。
- Artifact Registryへのイメージpushとcloud Runへのデプロイを自動化するCI/CDは別途整備する(CLAUDE.md 4.6)。
