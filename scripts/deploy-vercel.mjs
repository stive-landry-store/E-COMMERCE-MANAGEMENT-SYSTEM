/**
 * Deploy to Vercel (production) using local .env for Vite build vars.
 * Prerequisite: npx vercel login  (once)
 */
import { readFileSync, existsSync } from "fs";
import { spawnSync } from "child_process";
import { resolve } from "path";

const root = resolve(process.cwd());
const envPath = resolve(root, ".env");

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = loadEnvFile(envPath);
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const who = spawnSync("npx", ["vercel", "whoami"], { encoding: "utf8", shell: true });
if (who.status !== 0) {
  console.error("Not logged in to Vercel.");
  console.error("Run this once in your terminal, then re-run: npm run deploy:vercel");
  console.error("  npx vercel login");
  process.exit(1);
}

console.log("Logged in as:", (who.stdout || "").trim());
console.log("Setting production env vars…");

function setEnv(name, value) {
  // Remove existing then add (idempotent-ish)
  spawnSync("npx", ["vercel", "env", "rm", name, "production", "-y"], {
    encoding: "utf8",
    shell: true,
    stdio: "ignore",
  });
  const r = spawnSync("npx", ["vercel", "env", "add", name, "production"], {
    encoding: "utf8",
    shell: true,
    input: value + "\n",
  });
  if (r.status !== 0) {
    console.warn(r.stderr || r.stdout || `Could not set ${name} (may already exist)`);
  } else {
    console.log("OK", name);
  }
}

setEnv("VITE_SUPABASE_URL", url);
setEnv("VITE_SUPABASE_ANON_KEY", key);

console.log("Deploying to production…");
const deploy = spawnSync(
  "npx",
  ["vercel", "--prod", "--yes", "--name", "stive-landry-store"],
  { encoding: "utf8", shell: true, stdio: "inherit" },
);

process.exit(deploy.status ?? 1);
