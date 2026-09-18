import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloud Run上の軽量なコンテナ実行のため standalone 出力を使用する
  output: "standalone",
  // モノレポ構成のため、ファイルトレースのルートをリポジトリルートに合わせる
  outputFileTracingRoot: path.join(process.cwd(), "../../"),
};

export default nextConfig;
