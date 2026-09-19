import { createServerOnlyFn } from "@tanstack/react-start";

export type RedisClient = {
  get(key:string):Promise<string|null>;
  set(key:string,value:string,options?:{EX?:number}):Promise<unknown>;
  del(key:string):Promise<unknown>;
};

let clientPromise: Promise<RedisClient|null>|null=null;
export const getRedis=createServerOnlyFn(async():Promise<RedisClient|null>=>{
  const url=process.env.REDIS_URL;
  if(!url) return null;
  if(clientPromise) return clientPromise;
  clientPromise=import("redis").then(async({createClient})=>{
    const client=createClient({url});
    client.on("error",()=>undefined);
    await client.connect();
    return client as unknown as RedisClient;
  }).catch(()=>null);
  return clientPromise;
});
