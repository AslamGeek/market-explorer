// Keep conventional Next.js build artifacts separate from the Sites preview.
process.env.NEXT_RUNTIME_BUILD="1";
await import("../node_modules/next/dist/bin/next");
