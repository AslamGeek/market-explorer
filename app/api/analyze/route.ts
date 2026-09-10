import { z } from "zod";
import { googleProvider } from "@/lib/providers/google";
import { ProviderError } from "@/lib/providers/types";
import { runtimeConfig } from "@/lib/server/runtime";
import { consumeAnalysis, quotaDatabase } from "@/lib/server/rate-limit";
export const dynamic="force-dynamic";
const schema=z.object({business:z.string().trim().min(2).max(80),location:z.string().trim().min(3).max(180),browserId:z.string().regex(/^[a-zA-Z0-9-]{16,80}$/)}).strict();
export async function POST(request:Request) {
  const headers=new Headers({"Cache-Control":"no-store","Vary":"Cookie"});
  const respond=(value:unknown,status=200)=>Response.json(value,{status,headers});
  const origin=request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return respond({error:"This request must come from the app."},403);
  if (!request.headers.get("content-type")?.includes("application/json")) return respond({error:"Expected a JSON analysis request."},415);
  let body:unknown;
  try {
    const reader=request.body?.getReader(); if (!reader) return respond({error:"Provide a business and a location."},400);
    let size=0,text="";const decoder=new TextDecoder();
    for (;;) {const {value,done}=await reader.read();if(done) break;size+=value.byteLength;if(size>2048){await reader.cancel();return respond({error:"The analysis request is too large."},413);}text+=decoder.decode(value,{stream:true});}
    body=JSON.parse(text+decoder.decode());
  } catch {return respond({error:"The analysis request is not valid JSON."},400);}
  const parsed=schema.safeParse(body);
  if (!parsed.success) return respond({error:"Enter a business (2–80 characters) and a location (3–180 characters)."},400);
  let remaining:number|undefined;
  try {
    const {env,cloudflare}=await runtimeConfig();
    if (!env.GOOGLE_PLACES_API_KEY || (env.RATE_LIMIT_SECRET?.length || 0)<32) return respond({error:"Live analysis is not configured yet. Add the Google server key and rate-limit secret described in the README. You can explore the sample market below.",code:"SETUP_REQUIRED"},503);
    const cookie=request.headers.get("cookie")?.match(/(?:^|;\s*)lie_session=([a-zA-Z0-9-]{16,80})(?:;|$)/)?.[1];
    const session=cookie || crypto.randomUUID();
    headers.set("Set-Cookie",`lie_session=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`);
    // CF overwrites this header. Other deployments must configure a trusted proxy.
    const ip=cloudflare ? request.headers.get("cf-connecting-ip") || "unknown-proxy" : env.TRUSTED_IP_HEADER ? request.headers.get(env.TRUSTED_IP_HEADER)?.split(",")[0].trim() || "unknown-proxy" : "localhost";
    const quota=await consumeAnalysis(await quotaDatabase(env,cloudflare),env,{ip,browser:parsed.data.browserId,session});
    remaining=quota.remaining;
    if (!quota.allowed) {headers.set("Retry-After",String(Math.ceil((Date.parse(quota.resetAt)-Date.now())/1000)));return respond({error:`Today's ${quota.limit} market analyses have been used. Your allowance resets at midnight UTC. Filters, maps and comparisons remain available.`,code:"DAILY_LIMIT",...quota},429);}
    const market=await googleProvider(env.GOOGLE_PLACES_API_KEY).search(parsed.data);
    return respond({...market,remaining});
  } catch(error) {
    if(error instanceof ProviderError) return respond({error:error.message,code:error.code,remaining},error.status);
    // Do not log request text, provider payloads, addresses, or credentials.
    return respond({error:"The analysis service is temporarily unavailable. Please try again later.",remaining},503);
  }
}
