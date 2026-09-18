import { apiClient } from "@/lib/api-client";

export const dynamic = "force-dynamic";

async function getApiHealth() {
  try {
    const res = await apiClient.health.$get();
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function Home() {
  const health = await getApiHealth();
  const isOk = health?.status === "ok";

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 font-sans dark:bg-black">
      <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
        honobun
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        API status:{" "}
        <span className={isOk ? "text-green-600" : "text-red-600"}>
          {health?.status ?? "unreachable"}
        </span>
      </p>
    </div>
  );
}
