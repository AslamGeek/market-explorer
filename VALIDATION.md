# Validation

- TypeScript application check: passed.
- Functional tests: 13 passed, using actual SQLite for atomic quota checks and mocked Google HTTP responses for provider edge cases.
- Tested scoring thresholds, missing-value handling, medians, compound filters, sorting, evidence-gated insights, normalization, duplicate removal, nearby/text endpoint selection, unknown free-text types, ambiguous locations, Google quota errors, concurrent requests, identifier changes and UTC rollover.
- HTTP checks: `/`, `/terms`, `/privacy`, and `/api/config` returned 200. Malformed analysis input returned 400 without consuming quota. The live request returned a safe provider error and decremented the allowance once. Responses use `Cache-Control: no-store` and the session cookie is HttpOnly.
- Google credential check: Geocoding API returned `REQUEST_DENIED` because billing is not enabled on the supplied key's project. No live business listings were returned or persisted. Successful live Places/map acceptance testing is pending billing and a separate referrer-restricted Maps browser key.
- The optional WebMCP analysis tool is feature-detected. This environment has no supported WebMCP contract-validation context; its browser contract was not verified. The ordinary form uses the same analysis action.
- Browser interaction and visual QA were not requested and were not performed. The preview was served successfully and opened in the app.

The mock provider tests do not prove the operator's Google project configuration. Enable billing and the three required APIs, then run a live analysis and confirm location resolution, returned records, attribution and map synchronization before a public live-data launch.
- Conventional Next.js production build: passed, including TypeScript and prerendered pages.
- Sites / Cloudflare Worker production build: passed.
