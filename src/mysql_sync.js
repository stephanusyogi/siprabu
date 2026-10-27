/**
 * SI-PRABU Clean Web Edition v3.0
 * Synchronous MySQL Driver Bridge (Powered by Worker Threads & SharedArrayBuffer)
 * Pengembang: emenje & Stephanus Yogi
 * 
 * Mengizinkan engine SI-PRABU berkomunikasi langsung secara fullpoint ke MySQL
 * tanpa merombak arsitektur kalkulasi anggaran yang sudah teruji.
 */

const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');
const v8 = require('node:v8');
const path = require('path');

if (!isMainThread) {
  // ==========================================================================
  // WORKER THREAD: Eksekutor MySQL Asinkron
  // ==========================================================================
  const mysql = require('mysql2/promise');
  const { config, sabSignal, sabData } = workerData;
  const signal = new Int32Array(sabSignal);
  const dataBuf = Buffer.from(sabData);

  let pool = null;

  function translateSql(sql) {
    if (!sql) return '';
    let s = String(sql).trim();

    // 1. Abaikan PRAGMA SQLite
    if (/^\s*PRAGMA/i.test(s)) {
      if (/foreign_keys\s*=\s*ON/i.test(s)) return 'SET FOREIGN_KEY_CHECKS = 1;';
      return '/* PRAGMA IGNORED */';
    }

    // 2. Translasi sintaks INSERT & TABLE SQLite -> MySQL
    s = s.replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, 'REPLACE INTO');
    s = s.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT IGNORE INTO');

    // 3. Translasi Transaksi & Pengamanan Savepoint pada Connection Pool
    if (/^BEGIN(\s+(TRANSACTION|IMMEDIATE|EXCLUSIVE|DEFERRED))?\s*;?$/i.test(s)) {
      return 'START TRANSACTION;';
    }
    if (/^\s*(SAVEPOINT|RELEASE\s+SAVEPOINT|ROLLBACK\s+TO\s+SAVEPOINT)\b/i.test(s)) {
      return '/* SAVEPOINT IGNORED */';
    }

    // 4. Escape kata kunci reservasi MySQL `key` (terutama tabel settings_satker)
    s = s.replace(/(\b(?:WHERE|SET|SELECT|AND|OR|,|\()\s*)key(\s*(?:=|<|>|IN|LIKE|,|\)))/gi, '$1`key`$2');

    // 5. Translasi sintaks fungsi agregasi & waktu SQLite -> MySQL
    s = s.replace(/GROUP_CONCAT\(([^,]+),\s*['"]([^'"]+)['"]\)/gi, "GROUP_CONCAT($1 SEPARATOR '$2')");
    s = s.replace(/datetime\('now'\)/gi, 'NOW()');
    s = s.replace(/date\('now'\)/gi, 'CURDATE()');

    // 6. Translasi DDL SQLite -> MySQL
    if (/CREATE\s+TABLE/i.test(s)) {
      s = s.replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, 'INT NOT NULL AUTO_INCREMENT PRIMARY KEY');
      s = s.replace(/AUTOINCREMENT/gi, 'AUTO_INCREMENT');
      s = s.replace(/\bTEXT(\s+NOT\s+NULL)?\s+DEFAULT\s+CURRENT_TIMESTAMP\b/gi, 'DATETIME$1 DEFAULT CURRENT_TIMESTAMP');
      s = s.replace(/\bTEXT(\s+NOT\s+NULL)?\s+DEFAULT\b/gi, 'VARCHAR(255)$1 DEFAULT');
    }

    if (/ALTER\s+TABLE/i.test(s)) {
      s = s.replace(/\bTEXT(\s+NOT\s+NULL)?\s+DEFAULT\s+CURRENT_TIMESTAMP\b/gi, 'DATETIME$1 DEFAULT CURRENT_TIMESTAMP');
      s = s.replace(/\bTEXT(\s+NOT\s+NULL)?\s+DEFAULT\b/gi, 'VARCHAR(255)$1 DEFAULT');
    }

    return s;
  }

  async function start() {
    pool = mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit: 15,
      queueLimit: 0,
      multipleStatements: true,
      charset: 'utf8mb4',
      supportBigNumbers: true,
      bigNumberStrings: false,
      dateStrings: true
    });

    // Notify ready
    signal[0] = 0;

    parentPort.on('message', async (req) => {
      const { type, sql, params } = req;
      const translated = translateSql(sql);

      try {
        if (translated === '/* PRAGMA IGNORED */' || translated === '/* SAVEPOINT IGNORED */') {
          const payload = v8.serialize({ success: true, result: [] });
          payload.copy(dataBuf, 4);
          dataBuf.writeInt32LE(payload.length, 0);
          signal[0] = 2; // done
          Atomics.notify(signal, 0, 1);
          return;
        }

        if (type === 'query') {
          // Flatten params if passed as nested array
          let cleanParams = Array.isArray(params) ? params : [];
          if (cleanParams.length === 1 && Array.isArray(cleanParams[0])) {
            cleanParams = cleanParams[0];
          }

          const [rows, fields] = await pool.query(translated, cleanParams);
          let resultData;
          if (Array.isArray(rows)) {
            resultData = rows.map(r => ({ ...r }));
          } else {
            resultData = {
              changes: rows.affectedRows || 0,
              lastInsertRowid: rows.insertId || 0
            };
          }
          const payload = v8.serialize({ success: true, result: resultData });
          payload.copy(dataBuf, 4);
          dataBuf.writeInt32LE(payload.length, 0);
        } else if (type === 'exec') {
          await pool.query(translated);
          const payload = v8.serialize({ success: true });
          payload.copy(dataBuf, 4);
          dataBuf.writeInt32LE(payload.length, 0);
        }
      } catch (err) {
        // Abaikan error duplicate column pada ALTER TABLE ADD COLUMN
        if (err.code === 'ER_DUP_FIELDNAME') {
          const payload = v8.serialize({ success: true, result: [] });
          payload.copy(dataBuf, 4);
          dataBuf.writeInt32LE(payload.length, 0);
        } else {
          const payload = v8.serialize({ success: false, error: err.message, code: err.code });
          payload.copy(dataBuf, 4);
          dataBuf.writeInt32LE(payload.length, 0);
        }
      }

      signal[0] = 2; // done
      Atomics.notify(signal, 0, 1);
    });
  }

  start().catch(err => {
    const payload = v8.serialize({ success: false, error: 'MySQL Worker Error: ' + err.message });
    payload.copy(dataBuf, 4);
    dataBuf.writeInt32LE(payload.length, 0);
    signal[0] = 2;
    Atomics.notify(signal, 0, 1);
  });

} else {
  // ==========================================================================
  // MAIN THREAD: Kompatibel dengan API DatabaseSync (node:sqlite)
  // ==========================================================================

  class MySQLStatement {
    constructor(client, sql) {
      this.client = client;
      this.sql = sql;
    }

    all(...args) {
      const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      const res = this.client._sendSync('query', this.sql, params);
      return Array.isArray(res) ? res : [];
    }

    get(...args) {
      const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      const res = this.client._sendSync('query', this.sql, params);
      if (Array.isArray(res)) {
        return res.length > 0 ? res[0] : undefined;
      }
      return undefined;
    }

    run(...args) {
      const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      const res = this.client._sendSync('query', this.sql, params);
      if (res && typeof res === 'object') {
        return {
          changes: res.changes || 0,
          lastInsertRowid: res.lastInsertRowid || 0
        };
      }
      return { changes: 0, lastInsertRowid: 0 };
    }
  }

  class MySQLDatabaseSync {
    constructor(config) {
      this.config = config;
      this.sabSignal = new SharedArrayBuffer(4);
      this.signal = new Int32Array(this.sabSignal);
      // Alokasikan shared buffer 32 MB untuk menangani data RKB besar
      this.sabData = new SharedArrayBuffer(32 * 1024 * 1024);
      this.dataBuf = Buffer.from(this.sabData);

      this.signal[0] = 1; // 1 = initializing

      this.worker = new Worker(__filename, {
        workerData: {
          config: this.config,
          sabSignal: this.sabSignal,
          sabData: this.sabData
        }
      });

      // Tunggu inisialisasi koneksi awal
      this._waitInit();
    }

    _waitInit() {
      // Tunggu hingga worker siap (maks 5 detik)
      const start = Date.now();
      while (this.signal[0] === 1 && Date.now() - start < 5000) {
        Atomics.wait(this.signal, 0, 1, 100);
      }
    }

    _sendSync(type, sql, params = []) {
      this.signal[0] = 1; // 1 = working
      this.worker.postMessage({ type, sql, params });
      
      // Tunggu synchronous hingga worker selesai
      Atomics.wait(this.signal, 0, 1);

      const len = this.dataBuf.readInt32LE(0);
      if (len <= 0) return null;

      const payload = this.dataBuf.subarray(4, 4 + len);
      const res = v8.deserialize(payload);

      if (!res.success) {
        throw new Error(`[MySQL Error] ${res.error} (SQL: ${sql})`);
      }

      return res.result;
    }

    prepare(sql) {
      return new MySQLStatement(this, sql);
    }

    exec(sql) {
      this._sendSync('exec', sql);
    }

    close() {
      if (this.worker) {
        this.worker.terminate();
      }
    }
  }

  function createMySQLDatabaseSync(config) {
    return new MySQLDatabaseSync(config);
  }

  module.exports = {
    MySQLDatabaseSync,
    createMySQLDatabaseSync
  };
}
