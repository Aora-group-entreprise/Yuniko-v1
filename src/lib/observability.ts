import { trackError } from "./analytics";
function sendSentry(error:unknown,context?:Record<string,string>):void{
 const dsn=import.meta.env.VITE_SENTRY_DSN as string|undefined; if(!dsn) return;
 try{const u=new URL(dsn); const project=u.pathname.split("/").filter(Boolean).pop(); if(!project) return;
 const endpoint=u.protocol+"//"+u.host+"/api/"+project+"/store/?sentry_version=7&sentry_key="+encodeURIComponent(u.username);
 void fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:error instanceof Error?error.message:String(error),level:"error",platform:"javascript",tags:context,exception:error instanceof Error?{values:[{type:error.name,value:error.message}]}:undefined})}).catch(()=>undefined);
 }catch{/* optional integration */}
}
export function reportError(error:unknown,context?:Record<string,string>):void{
 trackError(error,context); sendSentry(error,context);
 const endpoint=import.meta.env.VITE_OTEL_HTTP_ENDPOINT as string|undefined;
 if(endpoint) void fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"yuniko.error",time:new Date().toISOString(),attributes:context,error:String(error)})}).catch(()=>undefined);
}
export function recordMetric(name:string,value:number,unit?:string,tags?:Record<string,string>):void{
 if(import.meta.env.DEV) console.debug("[Yuniko metric]",{name,value,unit,tags});
}
export function startPerformanceSpan(name:string):()=>void{const start=performance.now();return()=>recordMetric(name,performance.now()-start,"ms");}