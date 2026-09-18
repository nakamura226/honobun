# @honobun/db

Drizzle ORM によるスキーマ定義・マイグレーション管理（PostgreSQL / Cloud SQL 想定）。

## セットアップ

`DATABASE_URL` を環境変数として設定してください（ルートの `.env.example` 参照）。

```
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
- Cloud Run からは Cloud SQL Auth Proxy のUnixソケット (`/cloudsql/PROJECT:REGION:INSTANCE`) を想定
- Cloud SQL Auth Proxy vs Cloud SQL Node.js Connector のどちらを採用するかは未確定（`CLAUDE.md` 7章）
