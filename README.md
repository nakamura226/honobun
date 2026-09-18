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

`apps/web` のトップページで `apps/api` の `/health` への型安全なRPC疎通を確認できる。
LLMチャットは `POST /api/chat`(`apps/api`)に `{ provider, messages }` を送るとストリーミングで応答する
(利用するプロバイダーのAPIキーを `apps/api/.env` に設定していること)。

## スクリプト

| コマンド | 内容 |
|---|---|
| `pnpm lint` / `pnpm typecheck` / `pnpm build` | 全workspace対象 (scriptを持たないパッケージはスキップ) |
| `pnpm dev:web` / `pnpm dev:api` | 各アプリの開発サーバー起動 |
| `pnpm db:generate` / `db:migrate` / `db:push` / `db:studio` | Drizzleマイグレーション操作 (`packages/db`) |

## 環境変数

| 変数名 | 設定先 | 説明 |
|---|---|---|
| `PORT` | `apps/api/.env` | apiのlistenポート (既定 3000) |
| `WEB_ORIGIN` | `apps/api/.env` | CORS許可オリジン (既定 `http://localhost:3001`) |
| `ANTHROPIC_API_KEY` | `apps/api/.env` | Anthropic利用時のみ必須 |
| `OPENAI_API_KEY` | `apps/api/.env` | OpenAI利用時のみ必須 |
| `GOOGLE_GENERATIVE_AI_API_KEY` | `apps/api/.env` | Gemini利用時のみ必須 |
| `NEXT_PUBLIC_API_URL` | `apps/web/.env.local` | RPCクライアントの接続先 (既定 `http://localhost:3000`、apiのデフォルトポートと一致していれば省略可) |
| `DATABASE_URL` | `packages/db/.env` | PostgreSQL接続文字列 |

いずれもローカル開発時は各ファイルが存在しなくても既定値で動作する(DB/LLM機能を使わない場合)。
`apps/api` は Node.jsの `--env-file-if-exists` で `.env` を読み込むため、ファイルが無くても
(Cloud Run等で環境変数が直接注入される場合でも)エラーにならない。

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
