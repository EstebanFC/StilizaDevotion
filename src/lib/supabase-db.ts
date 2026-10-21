import { Pool } from "pg";
import { CRMDatabaseState } from "@/types/crm";
import { getInitialSeedData, readDB, writeDB } from "@/lib/db";

let pool: Pool | null = null;
let schemaInitialized = false;

function getPgPool(): Pool | null {
  const rawConn =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;

  if (!rawConn) return null;

  if (!pool) {
    // Strip sslmode parameter from URL so node-postgres uses our explicit ssl: { rejectUnauthorized: false }
    const cleanConn = rawConn.replace(/[?&]sslmode=[^&]+/g, "");
    pool = new Pool({
      connectionString: cleanConn,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 5,
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 8000,
    });
  }
  return pool;
}

export async function ensureSupabaseSchema(): Promise<boolean> {
  const pgPool = getPgPool();
  if (!pgPool) return false;
  if (schemaInitialized) return true;

  const client = await pgPool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS stiliza_studio_state (
        id TEXT PRIMARY KEY,
        state JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS stiliza_branches (
        id TEXT PRIMARY KEY,
        brand TEXT NOT NULL,
        name TEXT NOT NULL,
        address TEXT,
        kiosks_count INT DEFAULT 1,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS stiliza_clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        credits_remaining INT DEFAULT 0,
        active_package TEXT,
        home_branch TEXT,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS stiliza_sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        branch_name TEXT,
        instructor TEXT,
        session_date TEXT,
        start_time TEXT,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS stiliza_bookings (
        id TEXT PRIMARY KEY,
        qr_token TEXT NOT NULL,
        client_name TEXT,
        branch_name TEXT,
        session_title TEXT,
        spot_id TEXT,
        status TEXT,
        booked_via TEXT,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    schemaInitialized = true;
    return true;
  } finally {
    client.release();
  }
}

async function syncRelationalTables(state: CRMDatabaseState): Promise<void> {
  const pgPool = getPgPool();
  if (!pgPool) return;

  const client = await pgPool.connect();
  try {
    for (const br of state.branches) {
      await client.query(
        `INSERT INTO stiliza_branches (id, brand, name, address, kiosks_count, data, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (id) DO UPDATE SET
           brand = EXCLUDED.brand,
           name = EXCLUDED.name,
           address = EXCLUDED.address,
           kiosks_count = EXCLUDED.kiosks_count,
           data = EXCLUDED.data,
           updated_at = NOW()`,
        [br.id, br.brand, br.name, br.address, br.kiosksCount, JSON.stringify(br)]
      );
    }

    if (state.clients.length > 0) {
      const clientIds = state.clients.map((c) => c.id);
      await client.query(
        `DELETE FROM stiliza_clients WHERE NOT (id = ANY($1::text[]))`,
        [clientIds]
      );
    }

    for (const cl of state.clients) {
      await client.query(
        `INSERT INTO stiliza_clients (id, name, phone, email, credits_remaining, active_package, home_branch, data, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           phone = EXCLUDED.phone,
           email = EXCLUDED.email,
           credits_remaining = EXCLUDED.credits_remaining,
           active_package = EXCLUDED.active_package,
           home_branch = EXCLUDED.home_branch,
           data = EXCLUDED.data,
           updated_at = NOW()`,
        [
          cl.id,
          cl.name,
          cl.phone,
          cl.email,
          cl.creditsRemaining,
          cl.activePackageName,
          cl.homeBranchName || "",
          JSON.stringify(cl),
        ]
      );
    }

    for (const ses of state.sessions) {
      await client.query(
        `INSERT INTO stiliza_sessions (id, title, branch_name, instructor, session_date, start_time, data, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           branch_name = EXCLUDED.branch_name,
           instructor = EXCLUDED.instructor,
           session_date = EXCLUDED.session_date,
           start_time = EXCLUDED.start_time,
           data = EXCLUDED.data,
           updated_at = NOW()`,
        [
          ses.id,
          ses.title,
          ses.branchName,
          ses.instructor,
          ses.date,
          ses.startTime,
          JSON.stringify(ses),
        ]
      );
    }

    for (const bk of state.bookings) {
      await client.query(
        `INSERT INTO stiliza_bookings (id, qr_token, client_name, branch_name, session_title, spot_id, status, booked_via, data, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
         ON CONFLICT (id) DO UPDATE SET
           qr_token = EXCLUDED.qr_token,
           client_name = EXCLUDED.client_name,
           branch_name = EXCLUDED.branch_name,
           session_title = EXCLUDED.session_title,
           spot_id = EXCLUDED.spot_id,
           status = EXCLUDED.status,
           booked_via = EXCLUDED.booked_via,
           data = EXCLUDED.data,
           updated_at = NOW()`,
        [
          bk.id,
          bk.qrToken,
          bk.clientName,
          bk.branchName,
          bk.sessionTitle,
          bk.spotId,
          bk.status,
          bk.bookedVia,
          JSON.stringify(bk),
        ]
      );
    }
  } catch {
    // Non-blocking relational sync
  } finally {
    client.release();
  }
}

/**
 * Lee el estado desde Supabase PostgreSQL y actualiza el caché local para que
 * cualquier operación síncrona o asíncrona trabaje siempre sobre la última versión de Supabase.
 */
export async function loadStateFromSupabase(): Promise<CRMDatabaseState> {
  const pgPool = getPgPool();
  if (!pgPool) {
    return readDB();
  }

  try {
    await ensureSupabaseSchema();
    const res = await pgPool.query(
      `SELECT state FROM stiliza_studio_state WHERE id = $1 LIMIT 1`,
      ["main_v4"]
    );

    if (res.rows.length > 0 && res.rows[0].state) {
      const state = res.rows[0].state as CRMDatabaseState;
      const seed = getInitialSeedData();
      let updated = false;

      // Desvincular el teléfono 9878710684 de la cuenta demo cli-1 si aún lo tenía asignado
      const demoCli1 = state.clients.find((c) => c.id === "cli-1");
      if (demoCli1 && demoCli1.phone.replace(/\D/g, "").includes("9878710684")) {
        demoCli1.phone = "+52 442 501 8821";
        updated = true;
      }
      state.branches = seed.branches;

      // Si el estado guardado aún no tiene la matriz oficial de 125 clases del JSON (ses-stsi-lunes-0715),
      // reemplazar las sesiones de prueba por los horarios oficiales reales de los 6 estudios
      if (!state.sessions.some((s) => s.id === "ses-stsi-lunes-0715")) {
        state.sessions = seed.sessions;
        updated = true;
      }

      if (updated) {
        await saveStateToSupabase(state);
      } else {
        writeDB(state);
      }
      return state;
    }

    // Si es la primera vez en Supabase, inicializar con las 6 sucursales oficiales
    const seed = getInitialSeedData();
    await saveStateToSupabase(seed);
    return seed;
  } catch {
    return readDB();
  }
}

/**
 * Persiste el estado tanto en Supabase PostgreSQL (tabla principal + tablas relacionales)
 * como en el caché local rápido.
 */
export async function saveStateToSupabase(
  state: CRMDatabaseState
): Promise<CRMDatabaseState> {
  writeDB(state);
  const pgPool = getPgPool();
  if (!pgPool) return state;

  try {
    await ensureSupabaseSchema();
    await pgPool.query(
      `INSERT INTO stiliza_studio_state (id, state, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET
         state = EXCLUDED.state,
         updated_at = NOW()`,
      ["main_v4", JSON.stringify(state)]
    );
    await syncRelationalTables(state);
  } catch {
    // Fallback al caché local si la red falla momentáneamente
  }
  return state;
}
