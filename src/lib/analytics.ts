type ProductEvent={name:string;properties?:Record<string,unknown>;timestamp:string};
const queue:ProductEvent[]=[]; const MAX_QUEUE=100;
export function track(name:string,properties?:Record<string,unknown>):void{
 const event={name,properties,timestamp:new Date().toISOString()}; queue.push(event); if(queue.length>MAX_QUEUE) queue.shift();
 if(import.meta.env.DEV) console.debug("[Yuniko analytics]",event);
 const endpoint=import.meta.env.VITE_POSTHOG_HOST; const key=import.meta.env.VITE_POSTHOG_KEY;
 if(endpoint&&key) void fetch(endpoint.replace(/\/$/,"")+"/capture",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({api_key:key,event:name,properties:{...properties,$lib:"yuniko-web"}})}).catch(()=>undefined);
}
export function trackError(error:unknown,properties?:Record<string,unknown>):void{track("$exception",{message:error instanceof Error?error.message:String(error),...properties});}