// Boot wrapper: make the server start resilient on fresh Railway deploys.
// - Defaults DATABASE_URL so the app works without extra config.
// - Creates the sqlite parent directory if needed.
// - Runs prisma migrate deploy + seed, but does NOT block the server from
//   starting if they fail — /healthz must pass so Railway doesn't kill us.

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

if (!process.env.DATABASE_URL) {
  // Prisma resolves relative sqlite paths against the schema directory, so
  // always use an absolute path to avoid surprises on Railway.
  const abs = process.env.SQLITE_PATH
    ? (path.isAbsolute(process.env.SQLITE_PATH)
        ? process.env.SQLITE_PATH
        : path.resolve(process.cwd(), process.env.SQLITE_PATH))
    : path.resolve(process.cwd(), "data", "traverse.db");
  process.env.DATABASE_URL = `file:${abs}`;
  console.log(`[boot] DATABASE_URL not set — defaulting to ${process.env.DATABASE_URL}`);
}

if (process.env.DATABASE_URL.startsWith("file:")) {
  const raw = process.env.DATABASE_URL.slice("file:".length);
  const abs = path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), "prisma", raw);
  const dir = path.dirname(abs);
  try {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[boot] sqlite directory ready at ${dir}`);
  } catch (e: any) {
    console.error(`[boot] could not create sqlite dir ${dir}:`, e?.message);
  }
}

function tryRun(label: string, cmd: string) {
  try {
    console.log(`[boot] ${label}…`);
    execSync(cmd, { stdio: "inherit", env: process.env });
    console.log(`[boot] ${label} done.`);
  } catch (e: any) {
    console.error(`[boot] ${label} failed — continuing. ${e?.message ?? e}`);
  }
}

tryRun("prisma migrate deploy", "npx --no-install prisma migrate deploy");
tryRun("seed demo data", "node dist/seed.js");

// Start the HTTP server. Importing ./index triggers app.listen().
require("./index");
