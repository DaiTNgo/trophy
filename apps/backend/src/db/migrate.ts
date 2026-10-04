import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import path from 'path';

async function runMigration() {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgres://trophy:trophy_secret@localhost:5432/trophy';

  // Create a dedicated postgres client for migrations (max 1 connection)
  const migrationClient = postgres(connectionString, { max: 1 });

  console.log('Running database migrations...');
  const db = drizzle(migrationClient);

  try {
    // In production (Docker), migrations are typically in /app/drizzle
    // In local dev, they are in apps/backend/drizzle
    const migrationsFolder = process.env.MIGRATIONS_DIR || path.resolve(process.cwd(), 'drizzle');
    
    await migrate(db, { migrationsFolder });
    console.log('Migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

runMigration();
