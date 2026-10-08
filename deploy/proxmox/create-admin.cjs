// Cria o primeiro utilizador (ADMIN) diretamente na base de dados. O install.sh corre
// isto em vez de chamar POST /auth/register porque a omissão é admin/admin e o registo
// exige 8 caracteres de password. A password vai cifrada com bcrypt, tal como a app faz.
//
// Só cria se ainda não houver utilizadores. Corre a partir de apps/backend, para o
// require encontrar o bcrypt e o pg do projeto:
//   DATABASE_URL=… ADMIN_USERNAME=admin ADMIN_PASSWORD=admin node create-admin.cjs
const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function main() {
  const { DATABASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
  if (!DATABASE_URL || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
    throw new Error('Faltam DATABASE_URL, ADMIN_USERNAME ou ADMIN_PASSWORD.');
  }

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query('SELECT count(*)::int AS n FROM "User"');
    if (rows[0].n > 0) {
      console.log('Users already exist — nothing to do.');
      return;
    }
    // O mesmo custo que o createUser do backend.
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
