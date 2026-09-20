// Zero-install local PostgreSQL for development.
// Spawns a real Postgres cluster (via the `embedded-postgres` package) with its data
// persisted under ./.pgdata, on port 5433 so it never collides with a system Postgres.
// Run with `npm run db:local` and leave it running in its own terminal; stop with Ctrl+C.
import EmbeddedPostgres from "embedded-postgres"
import { fileURLToPath } from "url"
import path from "path"
import fs from "fs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const databaseDir = path.join(__dirname, "..", ".pgdata")

const pg = new EmbeddedPostgres({
  databaseDir,
  user: "postgres",
  password: "postgres",
  port: 5433,
  persistent: true,
  // Force UTF8 so emoji/international guest names, event names, etc. store correctly
  // regardless of the host OS's default codepage (Windows defaults to a locale codepage otherwise).
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
})

const url = "postgresql://postgres:postgres@localhost:5433/events_partner?schema=public"

async function main() {
  console.log("Starting local PostgreSQL (first run downloads/initializes the cluster, this can take a minute)...")
  // initdb refuses a non-empty directory, so only initialise a brand-new cluster.
  if (!fs.existsSync(path.join(databaseDir, "PG_VERSION"))) await pg.initialise()
  await pg.start()
  await pg.createDatabase("events_partner").catch(() => {
    // already exists — fine
  })
  console.log("\nLocal PostgreSQL is running.")
  console.log(`Set this in your .env:\n  DATABASE_URL="${url}"\n`)
  console.log("Leave this running, then in another terminal run:")
  console.log("  npm run db:push")
  console.log("  npm run db:seed")
  console.log("  npm run dev\n")
  console.log("Press Ctrl+C to stop the database.")
}

async function shutdown() {
  console.log("\nStopping local PostgreSQL...")
  await pg.stop()
  process.exit(0)
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
