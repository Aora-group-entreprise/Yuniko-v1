import { trackError } from "./analytics";
export function reportError(error:unknown,context?:Record<string,string>):void{
 trackError(error,context); if(import.meta.env.DEV) console.error("[Yuniko error]",error,context);
 const endpoint=import.meta.env.VITE_OTEL_HTTP_ENDPOINT;
 if(endpoint) void fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:"yuniko.error",time:new Date().toISOString(),attributes:context,error:String(error)})}).catch(()=>undefined);
}
export function recordMetric(name:string,value:number,unit?:string,tags?:Record<string,string>):void{if(import.meta.env.DEV) console.debug("[Yuniko metric]",{name,value,unit,tags});}
export function startPerformanceSpan(name:string):()=>void{const start=performance.now();return()=>recordMetric(name,performance.now()-start,"ms");}