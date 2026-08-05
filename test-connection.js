const sql = require('mssql');

const config = {
  server: 'hpfisa.ddns.net',
  port: 1433,
  database: 'eSolver',
  user: 'uProFISA',
  password: 'uProFISA123$',
  options: {
    encrypt: false,
    trustServerCertificate: true
  },
  connectionTimeout: 10000 // 10s timeout
};

console.log('Trying to connect to hpfisa.ddns.net...');
sql.connect(config)
  .then(pool => {
    console.log('SUCCESS: Connected successfully!');
    return pool.request().query('SELECT TOP 5 * FROM VIEW_PRD_TALLER_OT');
  })
  .then(result => {
    console.log('Query result success, rows fetched:', result.recordset.length);
    console.log('Sample row:', result.recordset[0]);
    sql.close();
  })
  .catch(err => {
    console.error('CONNECTION FAILED:', err);
    sql.close();
  });
