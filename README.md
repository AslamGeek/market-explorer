# Location Intelligence Explorer

A lean market-entry research app built with Next.js App Router, TypeScript, Tailwind, shadcn/ui, Recharts, Google Maps JavaScript API, and server-side Places API (New).

## Run locally

Requires Node.js 22.13+ (Node 24 recommended) and npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The initial dashboard uses explicitly fictional sample data. Analyze Market always calls the backend for a live analysis; missing keys produce a setup error, never fabricated live results. No credentials are needed to explore the sample, filters, charts, comparison, or schematic sample territory.

Build and run standard Next.js:

```sh
npm run build
npm start
```

The default build uses Next.js and writes to `.next`, including `.next/routes-manifest.json`. The `dev:next`, `build:next`, and `start:next` commands are equivalent aliases. Legacy Cloudflare adapter files remain in the repository but are not used by these commands.

## Vercel deployment

Import this repository with the **Next.js** framework preset and repository root as the Root Directory. `vercel.json` sets the build command to `npm run build`. Leave the Output Directory override disabled; Next.js uses `.next`. Remove any previous `.next-standard` or `dist` override and redeploy the latest commit without the build cache.

Add the Google keys and `RATE_LIMIT_SECRET` below to Vercel's environment variables; local `.env.local` files are not uploaded. Never commit secret values.

The dashboard can deploy with sample data. Live analysis also requires a shared quota database adapter: the current local SQLite backend is for a persistent single-instance Node server and is not compatible with Vercel Functions. Moving that database to `/tmp` would lose daily quota enforcement across instances. Configure a shared transactional store before enabling live analysis on Vercel.

## Google setup

Enable billing and these APIs in Google Cloud:

1. **Places API (New)** — server-side nearby and text search.
2. **Geocoding API** — resolve the submitted territory to a center point.
3. **Maps JavaScript API** — interactive Google map.

Create separate keys:

- A server key restricted to Places API (New) and Geocoding API. Keep it out of client bundles. Add appropriate server restrictions supported by your hosting/network setup.
- A browser key restricted to Maps JavaScript API and your exact website HTTP referrers. This key is intentionally public. Add localhost referrers for local development.

Set the variables below in `.env.local`, or as runtime variables/secrets in the hosting provider. Do not paste keys into source control. Restart after configuration changes.

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `GOOGLE_PLACES_API_KEY` | Secret server key for Places and Geocoding | Required for live analysis |
| `GOOGLE_MAPS_API_KEY` | Alias for the private server key; `GOOGLE_PLACES_API_KEY` takes precedence | Optional |
| `GOOGLE_MAPS_BROWSER_KEY` | Referrer-restricted public Maps JavaScript key, delivered through `/api/config` | Required for live map |
| `GOOGLE_MAPS_MAP_ID` | Optional Google cloud map ID | `DEMO_MAP_ID` |
| `DAILY_ANALYSIS_LIMIT` | Maximum anonymous analysis attempts per UTC day | `5` |
| `RATE_LIMIT_SECRET` | Random secret, at least 32 characters, for daily HMAC identifiers | Required for live analysis |
| `TRUSTED_IP_HEADER` | For conventional Next.js behind a trusted proxy that overwrites this header; never trust arbitrary forwarded input | Unset; localhost fallback |
| `DB` | Cloudflare D1 binding, configured in `.openai/hosting.json`, not a string environment variable | Hosting-managed |

Generate a rate-limit secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## Architecture

`lib/verticals.ts` → `lib/providers/google.ts` → `lib/model.ts` → `components/explorer.tsx` → `lib/analysis.ts` → table / charts / map / comparison.

- **Verticals:** Add aliases, supported Google types, direct/adjacent category labels, and subtype filters in `lib/verticals.ts`. Unknown free-text business types use a bounded Text Search (New) query; they are not silently mapped to cafes.
- **Providers:** `SearchProvider` in `lib/providers/types.ts` defines the normalized contract and export capability. Add future providers in this folder and select them in the backend. OpenStreetMap is intentionally not implemented.
- **Backend:** `/api/analyze` validates input, checks anonymous usage, calls the provider and returns transient normalized records. `/api/config` returns only public Maps configuration and availability, never the server key.
- **Client:** One in-memory result set powers all filters, sorting, statistics, charts, marker highlights, selection and comparison. Live results are cleared on reload and after 30 minutes. No Google content goes into browser storage.
- **Rate limit:** One atomic conditional SQL insert checks IP, browser ID and session ID quotas independently. Only daily HMAC identifiers and timestamps are stored. D1 backs Workers; local/conventional single-instance Next.js uses SQLite under `.data/`. Old quota rows are removed on the next request after UTC rollover. Put multi-instance Next.js deployments behind a shared transactional store before scaling.

## Search scope and limitations

Known verticals use Nearby Search (New) with supported configured types in a 5 km circle. This endpoint returns at most 20 places and has no pagination. Unknown business types use Text Search (New), one page of up to 20 results, then a 5 km distance filter. The UI states when a provider cap was reached. This is a provider-ranked sample of a market, not an exhaustive census; no fixed result count is promised. Adjacent categories (such as bakeries and spas) are visibly labeled and can be filtered.

Geocoding rejects missing, partial or ambiguous locations and asks for a more specific address. All distances are straight-line kilometers from the resolved center, not travel distances. Opening status is a snapshot when provided; unavailable fields remain unknown.

## Transparent competitor strength

The score is deterministic, from 0–100:

- Category: direct = 30, adjacent = 15, unverified free-text match = 10.
- Distance: up to 1 km = 25, up to 3 km = 15, up to 5 km = 5.
- Rating: at least 4.5 = 20, at least 4.0 = 15, at least 3.5 = 8, otherwise or unknown = 0.
- Reviews: at least 200 = 25, at least 50 = 15, at least 10 = 5, otherwise or unknown = 0.

Strong: at least 75. Moderate: 45–74. Emerging: below 45. Missing ratings/reviews can lower a score; this measures observed listing presence, not business quality or success. Change weights and thresholds in `lib/analysis.ts`. The dashboard includes the same explanation.

## Data handling

Google content is kept only in the active analysis and returned with `Cache-Control: no-store`. No permanent listing database, raw-result exports, review text, photos, LLM analysis, or background scraping. Raw Google responses and user search text are not logged. Google attribution and any third-party attributions are displayed with live results. Only Google Maps is used for live coordinates; the sample schematic contains fictional data only.

The app includes `/terms` and `/privacy`, with links to Google's terms and privacy policy. Publish these policies at publicly accessible URLs before any public live-data launch; the private Sites preview itself is owner-only. The operator should review deployment-specific disclosures and the Google agreement applicable to their billing region.

Official references checked during implementation:

- [Nearby Search (New)](https://developers.google.com/maps/documentation/places/web-service/nearby-search)
- [Text Search (New)](https://developers.google.com/maps/documentation/places/web-service/text-search)
- [Supported place types](https://developers.google.com/maps/documentation/places/web-service/place-types)
- [Places attribution and storage policies](https://developers.google.com/maps/documentation/places/web-service/policies)

## Validation

See `VALIDATION.md` for executed checks and limits. Live Google acceptance testing requires operator-provided keys and billing. This repository does not include credentials.

## Disclaimer

Location Intelligence Explorer provides market and competitive indicators for preliminary research. It does not predict business success or investment outcomes.

## Legacy Cloudflare local database setup

The legacy Cloudflare adapter is not part of the default Next.js build. If explicitly using that adapter, build it with `node node_modules/vinext/dist/cli.js build`, then apply its migration to the local preview database:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_third_orphan.sql
```

Sites applies that migration to its hosted D1 database on publication. Conventional Next.js automatically creates its local quota-only SQLite database. Do not use a local SQLite file as a shared quota store across multiple replicas or on ephemeral serverless storage.

Run `npm test` and `npm run typecheck` to check the core behavior. In restricted Windows environments where a build utility cannot obtain user profile metadata, `scripts/tooling-compat.cjs` provides a local tooling fallback; it is not part of the application runtime.
