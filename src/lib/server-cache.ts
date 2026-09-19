import { getRedis } from "./redis";

const memory=new Map<string,{value:string;expiresAt:number}>();
export async function serverCacheGet<T>(key:string):Promise<T|null>{
  const redis=await getRedis();
  if(redis){const value=await redis.get(key);return value?JSON.parse(value) as T:null;}
  const item=memory.get(key);if(!item||item.expiresAt<=Date.now()){memory.delete(key);return null;}return JSON.parse(item.value) as T;
}
export async function serverCacheSet<T>(key:string,value:T,ttlSeconds:number):Promise<void>{
  const encoded=JSON.stringify(value);const redis=await getRedis();
  if(redis){await redis.set(key,encoded,{EX:ttlSeconds});return;}
  memory.set(key,{value:encoded,expiresAt:Date.now()+ttlSeconds*1000});
}
