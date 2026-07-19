'use strict';

const fs = require('fs');
const path = require('path');
const env = require('../config/env');
const db = require('../config/db');

async function runBootstrap() {
  if (!env.BOOTSTRAP_SEED) {
    console.log('[bootstrap] BOOTSTRAP_SEED is false. Skipping base data seed.');
    return;
  }

  try {
    console.log('[bootstrap] BOOTSTRAP_SEED is true. Executing programs seed...');
    const seedPath = path.join(__dirname, '..', '..', 'sql', '001_seed_programas_base.sql');
    if (!fs.existsSync(seedPath)) {
      console.warn(`[bootstrap] Seed file not found at: ${seedPath}`);
      return;
    }

    const sqlText = fs.readFileSync(seedPath, 'utf8');
    await db.query(sqlText);
    console.log('[bootstrap] Base data seeded successfully.');
  } catch (err) {
    console.error('[bootstrap] Error executing base data seed:', err.message);
    throw err;
  }
}

module.exports = {
  runBootstrap
};
