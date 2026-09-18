# @honobun/db

Drizzle ORM によるスキーマ定義・マイグレーション管理（PostgreSQL / Cloud SQL 想定）。

## セットアップ

```bash
cp .env.example .env
# 必要に応じて DATABASE_URL を編集(drizzle-kitがこのディレクトリの.envを自動読み込みする)

# ローカル開発用 Postgres の例
docker run --rm -d --name honobun-db \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=honobun \
  -p 5432:5432 postgres:16-alpine
```

## コマンド

- `pnpm db:generate` - `src/schema.ts` からマイグレーションSQLを生成
- `pnpm db:migrate` - マイグレーションを適用
- `pnpm db:push` - スキーマを直接DBへ反映（開発用）
- `pnpm db:studio` - Drizzle Studioを起動

## Cloud SQL 接続について

- ローカル/Cloud Run 双方とも `pg`(node-postgres) 経由の `DATABASE_URL` で接続する
- Cloud Run からは組み込みのCloud SQLコネクタ (Unixソケット `/cloudsql/PROJECT:REGION:INSTANCE`) を使用する（`infra/terraform` 参照）
- 本番相当のCloud SQL接続方式(プライベートIP化など)は未確定（`CLAUDE.md` 7章）
