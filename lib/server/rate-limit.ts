import type { RuntimeConfig } from "./runtime";
import { dailyLimit } from "./runtime";
export interface QuotaDatabase { first(sql:string,bindings:(string|number)[]):Promise<Record<string,unknown>|null>; run(sql:string,bindings:(string|number)[]):Promise<void> }
let localDb: Promise<QuotaDatabase> | undefined;
export async function quotaDatabase(env: RuntimeConfig, cloudflare: boolean): Promise<QuotaDatabase> {
  if (env.DB) return {first:async(sql,b)=>env.DB!.prepare(sql).bind(...b).first(),run:async(sql,b)=>{await env.DB!.prepare(sql).bind(...b).run();}};
  if (cloudflare) throw new Error("D1 quota binding is missing");
  localDb ??= (async()=>{
    const sqliteName="node:sqlite",fsName="node:fs";
    const {DatabaseSync}=await import(/* @vite-ignore */ /* webpackIgnore: true */ sqliteName);
    const {mkdirSync}=await import(/* @vite-ignore */ /* webpackIgnore: true */ fsName);
    mkdirSync(".data",{recursive:true});
    const db=new DatabaseSync(".data/quota.sqlite");
    db.exec("CREATE TABLE IF NOT EXISTS analysis_usage (id TEXT PRIMARY KEY NOT NULL, day TEXT NOT NULL, ip_hash TEXT NOT NULL, browser_hash TEXT NOT NULL, session_hash TEXT NOT NULL); CREATE INDEX IF NOT EXISTS usage_ip ON analysis_usage(day,ip_hash); CREATE INDEX IF NOT EXISTS usage_browser ON analysis_usage(day,browser_hash); CREATE INDEX IF NOT EXISTS usage_session ON analysis_usage(day,session_hash);");
    return {first:async(sql:string,b:(string|number)[])=>db.prepare(sql).get(...b) || null,run:async(sql:string,b:(string|number)[])=>{db.prepare(sql).run(...b);}};
  })();
  return localDb;
}
export const RESERVE_SQL = `INSERT INTO analysis_usage(id, day, ip_hash, browser_hash, session_hash)
SELECT ?, ?, ?, ?, ? WHERE
(SELECT count(*) FROM analysis_usage WHERE day=? AND ip_hash=?) < ? AND
(SELECT count(*) FROM analysis_usage WHERE day=? AND browser_hash=?) < ? AND
(SELECT count(*) FROM analysis_usage WHERE day=? AND session_hash=?) < ? RETURNING id`;
export async function consumeAnalysis(db:QuotaDatabase, env:RuntimeConfig, ids:{ip:string;browser:string;session:string}, now=new Date()) {
  const day=now.toISOString().slice(0,10),limit=dailyLimit(env);
  if (!env.RATE_LIMIT_SECRET || env.RATE_LIMIT_SECRET.length < 32) throw new Error("Rate limit secret is missing");
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(env.RATE_LIMIT_SECRET),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const hashes=await Promise.all([["ip",ids.ip],["browser",ids.browser],["session",ids.session]].map(async([kind,id])=>{
    const signature=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(`${day}:${kind}:${id}`));
    return Array.from(new Uint8Array(signature),x=>x.toString(16).padStart(2,"0")).join("");
  }));
  const [ip,browser,session]=hashes;
  await db.run("DELETE FROM analysis_usage WHERE day < ?",[day]);
  const accepted=await db.first(RESERVE_SQL,[crypto.randomUUID(),day,ip,browser,session,day,ip,limit,day,browser,limit,day,session,limit]);
  const usage=await db.first(`SELECT max(
    (SELECT count(*) FROM analysis_usage WHERE day=? AND ip_hash=?),
    (SELECT count(*) FROM analysis_usage WHERE day=? AND browser_hash=?),
    (SELECT count(*) FROM analysis_usage WHERE day=? AND session_hash=?)
  ) AS used`,[day,ip,day,browser,day,session]);
  return {allowed:!!accepted,remaining:Math.max(0,limit-Number(usage?.used || 0)),limit,resetAt:new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+1)).toISOString()};
}
