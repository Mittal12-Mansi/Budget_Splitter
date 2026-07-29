import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

export function getCached<T>(key: string): T | undefined {
  return cache.get<T>(key);
}

export function setCached<T>(key: string, value: T, ttl?: number): void {
  if (ttl !== undefined) {
    cache.set(key, value, ttl);
  } else {
    cache.set(key, value);
  }
}

export function invalidateCache(pattern: string): void {
  const keys = cache.keys();
  for (const key of keys) {
    if (key.includes(pattern)) {
      cache.del(key);
    }
  }
}

export function balanceCacheKey(groupId: number): string {
  return `balances:group:${groupId}`;
}

export function debtGraphCacheKey(groupId: number): string {
  return `debtgraph:group:${groupId}`;
}

export function dashboardCacheKey(userId: number): string {
  return `dashboard:user:${userId}`;
}
