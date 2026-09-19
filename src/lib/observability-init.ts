import { reportError } from "./observability";
export function initObservability():()=>void{
 const previous=window.onerror;
 const onError=(message:Event|string,source?:string,lineno?:number,colno?:number,error?:Error)=>{reportError(error??message,{source:source??"window",line:String(lineno??""),column:String(colno??"")});return previous?Boolean(previous(message,source,lineno,colno,error)):false;};
 window.onerror=onError;
 const onUnhandled=(event:PromiseRejectionEvent)=>reportError(event.reason,{source:"unhandledrejection"});
 window.addEventListener("unhandledrejection",onUnhandled);
 return()=>{window.onerror=previous;window.removeEventListener("unhandledrejection",onUnhandled);};
}