const { Pool } = require('pg');

const configs = [
  { host: 'localhost', port: 5432, user: 'postgres', password: 'postgres', database: 'postgres' },
  { host: 'localhost', port: 5432, user: 'postgres', password: 'password', database: 'postgres' },
  { host: 'localhost', port: 5432, user: 'postgres', password: 'secret', database: 'postgres' },
  { host: 'localhost', port: 5432, user: 'postgres', password: 'mysecretpassword', database: 'postgres' },
  { host: 'localhost', port: 5432, user: 'harshan2k21', password: 'postgres', database: 'postgres' },
  { host: 'localhost', port: 5432, user: 'harshan2k21', password: 'password', database: 'postgres' },
];

(async () => {
  for (const c of configs) {
    const p = new Pool(c);
    try {
      const r = await p.query('SELECT current_user, version()');
      console.log(`WIN: user=${c.user} password=[${c.password}]`, r.rows[0].current_user);
      process.exit(0);
    } catch (e) {
      console.log(`FAIL: user=${c.user} pw=[${c.password}]: ${e.message.split('\n')[0]}`);
    } finally {
      await p.end();
    }
  }
  console.log('All configs failed');
})();
