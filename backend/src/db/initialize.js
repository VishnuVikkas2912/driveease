import { readFile } from 'node:fs/promises';

// Caller supplies a dedicated connection so all setup is atomic. Never seed
// development users, overwrite existing application objects, or delete data.
export async function initializeEmptyDatabase(conn) {
  await conn.query('BEGIN');
  try {
    await conn.query(
      "SELECT pg_advisory_xact_lock(hashtext(current_schema()), hashtext('driveease:init'))",
    );
    const { rows } = await conn.query(
      'SELECT tablename FROM pg_tables WHERE schemaname=current_schema()',
    );
    if (rows.length)
      throw new Error(
        'Database schema is not empty. Initialization refused; existing data is preserved.',
      );
    await conn.query(
      await readFile(new URL('../../../database/schema.sql', import.meta.url), 'utf8'),
    );
    const fleet = await readFile(
      new URL('../../../database/migrations/002_fleet_and_photos.sql', import.meta.url),
      'utf8',
    );
    await conn.query(fleet.replace(/^BEGIN;\s*$/m, '').replace(/^COMMIT;\s*$/m, ''));
    await conn.query(
      await readFile(
        new URL('../../../database/migrations/003_server_only_access.sql', import.meta.url),
        'utf8',
      ),
    );
    await conn.query('COMMIT');
  } catch (error) {
    await conn.query('ROLLBACK');
    throw error;
  }
}
