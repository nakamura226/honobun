# プロジェクト要件定義書（CLAUDE.md）

## 1. プロジェクト概要

- **目的**: 学習・技術検証（モダンなフルスタック構成 + LLM連携 + GCPインフラの経験を積む）
- **公開範囲**: 個人利用・公開想定（ユーザー認証機能なし）
- **開発フェーズ**: 初期セットアップ（dev環境のみ構築、staging/prodは将来拡張）

---

## 2. 技術スタック

| 分類 | 技術 |
|---|---|
| 言語 | TypeScript, Node.js |
| フロントエンド | React, Next.js (App Router), Tailwind CSS |
| バックエンド | Hono |
| ORM | Drizzle ORM |
| DB | PostgreSQL (Cloud SQL) |
| LLM | Anthropic API, OpenAI API, Google Gemini API, Vercel AI SDK |
| インフラ | GCP (Cloud Run, Cloud SQL, GCS), Terraform |
| VCS | GitHub |
| パッケージ管理 | pnpm (workspaces) |

---

## 3. アーキテクチャ方針

### 3.1 サービス分離
フロントエンド（Next.js）とバックエンド（Hono）は **別サービス** として構成する。

- **理由**: Honoをそれ自体のフレームワークとして学習する、Cloud Run上での複数サービス運用（サービス間通信・認証・デプロイ）を経験するため。
- フロントエンドとバックエンドはそれぞれ個別のCloud Runサービスとしてデプロイする。
- フロント → バックエンドの通信は、HonoのRPC機能（`hc` クライアント）を用いて型安全に行う。

### 3.2 リポジトリ構成
**モノレポ**（pnpm workspaces）で管理する。

```
project-root/
├── apps/
│   ├── web/              # Next.js フロントエンド
│   └── api/               # Hono バックエンド
├── packages/
│   ├── db/                 # Drizzle スキーマ・マイグレーション（共有）
│   ├── shared/            # 共通の型定義・ユーティリティ
│   └── config/             # tsconfig/eslint等の共通設定
├── infra/
│   └── terraform/           # GCPインフラ定義（Cloud Run, Cloud SQL, GCS等）
├── .github/
│   └── workflows/           # GitHub Actions（CI/CD）
├── pnpm-workspace.yaml
├── package.json
└── CLAUDE.md
```

---

## 4. 各コンポーネント詳細

### 4.1 フロントエンド（apps/web）
- Next.js（App Router）+ TypeScript
- スタイリングは Tailwind CSS
- バックエンドAPIへのアクセスはHonoのRPC (`hc<AppType>`) を使用し、型安全な通信を行う
- 認証機能は実装しない

### 4.2 バックエンド（apps/api）
- Hono を用いたAPIサーバー
- Cloud Run上で動作するコンテナとしてデプロイ（Dockerfile想定）
- Drizzle ORM経由でCloud SQL（PostgreSQL）にアクセス
- LLM関連の処理（Anthropic/OpenAI/Gemini/Vercel AI SDK呼び出し）はこのバックエンド側に集約する
- ルート定義の型をフロントエンドと共有できるようエクスポートする

### 4.3 DB（packages/db）
- PostgreSQL（Cloud SQL）
- Drizzle ORM でスキーマ定義・マイグレーション管理
- マイグレーションは `drizzle-kit` を使用

### 4.4 LLM連携
- Vercel AI SDK を介して、Anthropic / OpenAI / Google Gemini の各APIを統一的なインターフェースで呼び出せるようにする
- APIキーは環境変数で管理し、Secret Managerでの管理も見据える

### 4.5 インフラ（infra/terraform）
- GCPリソースをTerraformでコード管理
  - Cloud Run（web, api の2サービス）
  - Cloud SQL（PostgreSQL）
  - GCS（静的ファイル・アセット用）
- 環境は **dev のみ** を先行構築し、将来的に staging/prod へ拡張できる設計（変数化・ワークスペース分割を意識）とする

### 4.6 CI/CD
- GitHub Actions によるCI（lint, typecheck, test）を最低限整備
- Cloud Runへの自動デプロイは初期段階では手動 or 簡易ワークフローでも可（後続タスクで拡張）

---

## 5. 開発フロー・規約

- パッケージマネージャは **pnpm** を使用し、`pnpm-workspace.yaml` でワークスペースを管理する
- Lint/Formatter: ESLint + Prettier（もしくはBiome導入も検討可）
- 型チェックを重視し、`any` の使用は極力避ける
- 環境変数は `.env` で管理し、`.env.example` をリポジトリに含める

---

## 6. Claude Codeへの初期セットアップ依頼事項

以下の順で初期構築を進めてください。

1. **モノレポ基盤の構築**
   - pnpm workspaces のセットアップ（`pnpm-workspace.yaml`, ルート `package.json`）
   - `packages/config` に共通の `tsconfig.json` / ESLint設定を作成

2. **apps/web（Next.js）の作成**
   - Next.js（App Router, TypeScript）をセットアップ
   - Tailwind CSS を導入
   - 最小限のトップページを作成

3. **apps/api（Hono）の作成**
   - Hono プロジェクトをセットアップ（Node.js runtime想定、Cloud Runでのコンテナ実行を前提）
   - ヘルスチェック用エンドポイント（`/health`）を実装
   - Dockerfileを作成

4. **packages/db（Drizzle）の作成**
   - Drizzle ORM のセットアップ
   - PostgreSQL接続設定（Cloud SQL接続を想定した設定）
   - サンプルスキーマとマイグレーションコマンドの整備

5. **フロント⇔バックエンドの型連携**
   - Hono の RPC機能を使い、`apps/web` から `apps/api` の型を参照できるようにする

6. **LLM連携の雛形実装**
   - Vercel AI SDK を `apps/api` に導入
   - Anthropic / OpenAI / Gemini の3プロバイダーを切り替え可能な形で呼び出すサンプル実装（例: シンプルなチャットエンドポイント）

7. **Terraformによるインフラ定義（dev環境）**
   - Cloud Run（web, api）、Cloud SQL、GCS のTerraformモジュール作成
   - dev環境用の `tfvars` を用意

8. **GitHub Actions（CI）**
   - lint / typecheck / build を実行するワークフローを追加

9. **README整備**
   - ローカル開発手順、環境変数一覧、デプロイ手順を記載

---

## 7. 未確定・要相談事項（Claude Codeとの対話で詰める想定）

- Cloud SQLへの接続方式（Cloud SQL Auth Proxy / Cloud SQL Connector など）
- Hono を Node.jsで動かすか、Cloud Run上でのランタイム選定（Node.js標準 or 他アダプタ）
- LLMのストリーミングレスポンス対応の要否
- GCSの具体的な用途（画像アップロード等の要否）
