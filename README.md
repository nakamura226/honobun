# honobun

Next.js + Hono + Drizzle + LLM(Anthropic/OpenAI/Gemini) + GCPインフラの技術検証用モノレポ。
詳細な要件・設計方針は [`CLAUDE.md`](./CLAUDE.md) を参照。

## 技術スタック

| 分類 | 技術 |
|---|---|
| フロントエンド | Next.js (App Router) / TypeScript / Tailwind CSS |
| バックエンド | Hono (Node.jsランタイム) |
| ORM / DB | Drizzle ORM / PostgreSQL (Cloud SQL) |
| LLM | Vercel AI SDK (Anthropic / OpenAI / Google Gemini) |
| インフラ | GCP (Cloud Run / Cloud SQL / GCS) / Terraform |
| パッケージ管理 | pnpm workspaces |

## リポジトリ構成

```
apps/
  web/     # Next.js フロントエンド (Cloud Runへ個別デプロイ)
  api/     # Hono バックエンド (Cloud Runへ個別デプロイ)
packages/
  db/      # Drizzle スキーマ・マイグレーション
  config/  # 共通 tsconfig / ESLint 設定
infra/
  terraform/  # GCPインフラ定義 (dev環境)
.github/
  workflows/  # CI (lint/typecheck/build)
```

## 前提

- Node.js >= 20.9 (開発は 22.13.1 で確認)
- pnpm 12.4.2 (`corepack enable` が環境によっては失敗するため、`npm install -g pnpm@12.4.2` を推奨)
- ローカルDBを立てる場合は Docker

## セットアップ

```bash
pnpm install

# 各アプリ/パッケージの環境変数を用意 (詳細は下表を参照)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
cp packages/db/.env.example packages/db/.env

# ローカルPostgres起動例
docker run --rm -d --name honobun-db \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=honobun \
  -p 5432:5432 postgres:16-alpine

# マイグレーション適用
pnpm db:migrate

# 開発サーバー起動 (別ターミナルでそれぞれ)
pnpm dev:api   # http://localhost:3000
pnpm dev:web   # http://localhost:3001
```

`apps/web` (http://localhost:3001) はチャットUI(会話一覧・メッセージ送信・画像添付)そのもの。
画像はGCSへ署名付きURL経由で直接アップロードされ、過去の履歴表示時も署名付きURLで取得する
(`apps/api` に `GCS_BUCKET_NAME` の設定と、実GCPまたはローカルエミュレータへの認証情報が必要)。
LLM応答は利用するプロバイダーのAPIキーを `apps/api/.env` に設定していないとエラーになる
(画像はLLMへの入力には使わず、保存・表示のみに利用する)。

ローカルで画像アップロードまで試す場合は [fake-gcs-server](https://github.com/fsouza/fake-gcs-server) が使える。

```bash
docker run --rm -d --name honobun-gcs -p 4443:4443 \
  fsouza/fake-gcs-server -scheme http -public-host localhost:4443
curl -s -X POST "http://localhost:4443/storage/v1/b?project=honobun-dev" \
  -H "Content-Type: application/json" -d '{"name":"honobun-dev-assets"}'
# apps/api/.env に GCS_API_ENDPOINT=http://localhost:4443 を設定
```

## スクリプト

| コマンド | 内容 |
|---|---|
| `pnpm lint` / `pnpm typecheck` / `pnpm build` | 全workspace対象 (scriptを持たないパッケージはスキップ) |
| `pnpm dev:web` / `pnpm dev:api` | 各アプリの開発サーバー起動 |
| `pnpm db:generate` / `db:migrate` / `db:push` / `db:studio` | Drizzleマイグレーション操作 (`packages/db`) |

## 環境変数

| 変数名 | 設定先 | 説明 |
|---|---|---|
| `DATABASE_URL` | `apps/api/.env` / `packages/db/.env` | **必須。** PostgreSQL接続文字列 (両方に同じ値を設定する)。未設定だとapiが起動時に落ちる |
| `GCS_BUCKET_NAME` | `apps/api/.env` | **必須。** 画像アップロード先のGCSバケット名。未設定だとapiが起動時に落ちる |
| `PORT` | `apps/api/.env` | apiのlistenポート (既定 3000) |
| `WEB_ORIGIN` | `apps/api/.env` | CORS許可オリジン (既定 `http://localhost:3001`) |
| `ANTHROPIC_API_KEY` | `apps/api/.env` | Anthropic利用時のみ必須 (未設定でも起動はする) |
| `OPENAI_API_KEY` | `apps/api/.env` | OpenAI利用時のみ必須 (未設定でも起動はする) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | `apps/api/.env` | Gemini利用時のみ必須 (未設定でも起動はする) |
| `GCS_API_ENDPOINT` | `apps/api/.env` | ローカルでfake-gcs-server等のエミュレータを使う場合のみ設定 |
| `NEXT_PUBLIC_API_URL` | `apps/web/.env.local` | RPCクライアントの接続先 (既定 `http://localhost:3000`、apiのデフォルトポートと一致していれば省略可) |

`DATABASE_URL` と `GCS_BUCKET_NAME` は `apps/api` の起動そのものに必要(チャット履歴・画像アップロード機能の中核のため)。
それ以外は未設定でも起動でき、`apps/api` は Node.jsの `--env-file-if-exists` で `.env` を読み込むため、
ファイルが無くても(Cloud Run等で環境変数が直接注入される場合でも)読み込み自体はエラーにならない。

## Docker

```bash
# リポジトリルートをビルドコンテキストにする
docker build -f apps/api/Dockerfile -t honobun-api .
docker build -f apps/web/Dockerfile -t honobun-web .

docker run --rm -p 8080:8080 -e PORT=8080 honobun-api
docker run --rm -p 3000:3000 -e PORT=3000 honobun-web
```

## デプロイ (GCP / Terraform)

`infra/terraform` にdev環境のTerraform定義がある。手順・設計判断は
[`infra/terraform/README.md`](./infra/terraform/README.md) を参照。

```bash
cd infra/terraform/envs/dev
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars を編集
terraform init
terraform apply
```

## CI

`.github/workflows/ci.yml` で push/PR時に以下を実行する。

- `pnpm lint` / `pnpm typecheck` / `pnpm build`
- `terraform fmt -check` / `terraform validate` (`infra/terraform`)
