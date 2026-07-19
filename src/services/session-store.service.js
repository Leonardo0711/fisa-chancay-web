'use strict';

const session = require('express-session');
const db = require('../config/db');

class SqlSessionStore extends session.Store {
  constructor() {
    super();
    // Clean up expired sessions every 15 minutes (900,000 ms)
    this.cleanupInterval = setInterval(() => {
      this.clearExpired().catch(err => {
        console.error('[SessionStore] Error cleaning up expired sessions:', err.message);
      });
    }, 900000);
    // Do not keep Node's event loop active for this timer
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  async get(sid, callback) {
    try {
      const res = await db.query(
        `SELECT sesdata FROM SEG_SESION WHERE sesid = @sid AND sesexp > GETDATE()`,
        { sid }
      );
      if (res.recordset.length === 0) {
        return callback(null, null);
      }
      const data = JSON.parse(res.recordset[0].sesdata);
      return callback(null, data);
    } catch (err) {
      return callback(err);
    }
  }

  async set(sid, sessionData, callback) {
    try {
      const sessStr = JSON.stringify(sessionData);
      
      // Calculate expiration date
      let expires = null;
      if (sessionData && sessionData.cookie && sessionData.cookie.expires) {
        expires = new Date(sessionData.cookie.expires);
      } else {
        // Default to 12 hours if no cookie expiration date is set
        expires = new Date(Date.now() + 12 * 60 * 60 * 1000);
      }

      await db.query(
        `MERGE INTO SEG_SESION AS target
         USING (VALUES (@sid, @sess, @expires)) AS source (sesid, sesdata, sesexp)
         ON target.sesid = source.sesid
         WHEN MATCHED THEN
           UPDATE SET sesdata = source.sesdata, sesexp = source.sesexp
         WHEN NOT MATCHED THEN
           INSERT (sesid, sesdata, sesexp)
           VALUES (source.sesid, source.sesdata, source.sesexp);`,
        {
          sid,
          sess: sessStr,
          expires
        }
      );
      return callback(null);
    } catch (err) {
      return callback(err);
    }
  }

  async destroy(sid, callback) {
    try {
      await db.query(`DELETE FROM SEG_SESION WHERE sesid = @sid`, { sid });
      return callback(null);
    } catch (err) {
      return callback(err);
    }
  }

  async touch(sid, sessionData, callback) {
    try {
      let expires = null;
      if (sessionData && sessionData.cookie && sessionData.cookie.expires) {
        expires = new Date(sessionData.cookie.expires);
      } else {
        expires = new Date(Date.now() + 12 * 60 * 60 * 1000);
      }

      await db.query(
        `UPDATE SEG_SESION SET sesexp = @expires WHERE sesid = @sid`,
        { sid, expires }
      );
      return callback(null);
    } catch (err) {
      return callback(err);
    }
  }

  async clearExpired() {
    await db.query(`DELETE FROM SEG_SESION WHERE sesexp < GETDATE()`);
  }
}

module.exports = SqlSessionStore;
