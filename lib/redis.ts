import { Redis } from '@upstash/redis'

let redis: Redis | null = null

export function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return redis
}

export async function setWithExpiry(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const client = getRedisClient()
  await client.setex(key, ttlSeconds, JSON.stringify(value))
}

export async function getJSON<T>(key: string): Promise<T | null> {
  const client = getRedisClient()
  const data = await client.get<T>(key)
  return data
}

export async function deleteKey(key: string): Promise<void> {
  const client = getRedisClient()
  await client.del(key)
}
