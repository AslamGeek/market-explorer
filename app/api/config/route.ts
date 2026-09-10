import { runtimeConfig, dailyLimit } from "@/lib/server/runtime";
export const dynamic="force-dynamic";
export async function GET() {
  const {env}=await runtimeConfig();
  return Response.json({mapsKey:env.GOOGLE_MAPS_BROWSER_KEY || "",mapId:env.GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID",dailyLimit:dailyLimit(env),liveReady:!!env.GOOGLE_PLACES_API_KEY && (env.RATE_LIMIT_SECRET?.length || 0) >= 32},{headers:{"Cache-Control":"no-store"}});
}
