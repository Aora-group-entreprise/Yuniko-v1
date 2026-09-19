import { createServerFn } from "@tanstack/react-start";
import { requireServerFeedClient } from "./candidate-generation.server";

export const getCachedCandidatePostIds=createServerFn({method:"GET"})
 .validator((data:{country:string|null})=>data)
 .handler(async({data})=>{
   const db=await requireServerFeedClient();
   return db.getCandidatePostIds(data.country);
 });
