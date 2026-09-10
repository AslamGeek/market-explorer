export interface RuntimeConfig {
  GOOGLE_PLACES_API_KEY?: string; GOOGLE_MAPS_API_KEY?: string; GOOGLE_MAPS_BROWSER_KEY?: string; GOOGLE_MAPS_MAP_ID?: string;
  DAILY_ANALYSIS_LIMIT?: string; RATE_LIMIT_SECRET?: string; TRUSTED_IP_HEADER?: string; DB?: D1Database;
}
export async function runtimeConfig(): Promise<{env:RuntimeConfig;cloudflare:boolean}> {
  try {
    const moduleName = "cloudflare:workers";
    const platform = await import(/* @vite-ignore */ /* webpackIgnore: true */ moduleName);
    const env=platform.env as RuntimeConfig;
    return {env:{...env,GOOGLE_PLACES_API_KEY:env.GOOGLE_PLACES_API_KEY||env.GOOGLE_MAPS_API_KEY},cloudflare:true};
  } catch { const env=process.env as RuntimeConfig;return {env:{...env,GOOGLE_PLACES_API_KEY:env.GOOGLE_PLACES_API_KEY||env.GOOGLE_MAPS_API_KEY},cloudflare:false}; }
}
export function dailyLimit(env: RuntimeConfig) {
  const n=Number(env.DAILY_ANALYSIS_LIMIT || 5);
  return Number.isInteger(n) && n >= 1 && n <= 100 ? n : 5;
}
