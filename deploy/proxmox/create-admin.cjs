// Creates the first user (ADMIN) directly in the database. install.sh runs this
// instead of calling POST /auth/register because the default is admin/admin and
// registration requires an 8-character password. The password is hashed with bcrypt,
// just like the app does.
//
// Only creates it if there are no users yet. Run from apps/backend, so that
// require finds the project's bcrypt and pg:
//   DATABASE_URL=… ADMIN_USERNAME=admin ADMIN_PASSWORD=admin node create-admin.cjs
const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function main() {
  const { DATABASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
  if (!DATABASE_URL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
    throw new Error('Missing DATABASE_URL, ADMIN_USERNAME or ADMIN_PASSWORD.');
  }

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query('SELECT count(*)::int AS n FROM "User"');
    if (rows[0].n > 0) {
      console.log('Users already exist — nothing to do.');
      return;
    }
    // Same cost as the backend's createUser.
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await client.query(
      `INSERT INTO "User" (id, username, "hashedPassword", role, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, 'ADMIN', now(), now())`,
      [ADMIN_USERNAME, hash],
    );
    console.log(`Account ${ADMIN_USERNAME} created (ADMIN).`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
