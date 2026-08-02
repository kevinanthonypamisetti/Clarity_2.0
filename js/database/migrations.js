import { DB } from './database.js';

export async function runMigrations() {
  if (!DB.db) await DB.init();
  // Schema currently created in openIndexedDB. Migrations are not yet
  // implemented in this repo. See TECHNICAL_DEBT.md for details.
  return true;
}
