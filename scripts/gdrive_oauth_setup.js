/**
 * SI-PRABU Clean Web Edition v3.0
 * CLI Setup Otorisasi OAuth 2.0 Google Drive (Opsi B - Akun Pribadi 15GB+)
 * Pengembang: emenje & Stephanus Yogi
 * 
 * Penggunaan:
 *   node scripts/gdrive_oauth_setup.js
 *   node scripts/gdrive_oauth_setup.js [client_id] [client_secret]
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const readline = require('readline');

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const OAUTH_OUTPUT_FILE = path.join(DATA_DIR, 'gdrive_oauth.json');
const CLIENT_SECRET_FILE = path.join(DATA_DIR, 'client_secret.json');
const PORT = 3555;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const FOLDER_ID = '1n0Br1SqX2Tl4lI0HP3faRr68ZnZB97oQ';

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

function loadEnvCredentials() {
  const envFile = path.resolve(__dirname, '..', '.env');
  let clientId = process.env.GOOGLE_CLIENT_ID || '';
  let clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf8');
    const idMatch = envContent.match(/^GOOGLE_CLIENT_ID\s*=\s*(.+)$/m);
    const secMatch = envContent.match(/^GOOGLE_CLIENT_SECRET\s*=\s*(.+)$/m);
    if (idMatch && !clientId) clientId = idMatch[1].trim().replace(/^['"]|['"]$/g, '');
    if (secMatch && !clientSecret) clientSecret = secMatch[1].trim().replace(/^['"]|['"]$/g, '');
  }
  return { clientId, clientSecret };
}

async function getClientCredentials() {
  const args = process.argv.slice(2);
  if (args.length >= 2) {
    return { client_id: args[0], client_secret: args[1] };
  }

  // 1. Cek dari .env jika sudah ada Client ID & Client Secret
  const { clientId: envId, clientSecret: envSec } = loadEnvCredentials();
  if (envId && envSec) {
    console.log(`[INFO] Kredensial OAuth2 otomatis dimuat dari .env!`);
    console.log(`- Client ID: ${envId.substring(0, 20)}...`);
    return { client_id: envId, client_secret: envSec };
  }

  // 2. Cek apakah ada file client_secret.json di folder data
  if (fs.existsSync(CLIENT_SECRET_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(CLIENT_SECRET_FILE, 'utf8'));
      const details = parsed.installed || parsed.web || parsed;
      if (details.client_id && details.client_secret) {
        console.log(`[INFO] Kredensial OAuth2 otomatis dimuat dari: ${CLIENT_SECRET_FILE}`);
        return { client_id: details.client_id, client_secret: details.client_secret };
      }
    } catch (e) {}
  }

  console.log('================================================================');
  console.log('  SI-PRABU SETUP OAUTH 2.0 GOOGLE DRIVE (OPSI B - AKUN PRIBADI)  ');
  console.log('================================================================\n');
  console.log('Pastikan Authorized redirect URIs di Google Cloud Console berisi:');
  console.log(`👉 ${REDIRECT_URI}\n`);

  let clientId = envId;
  if (!clientId) {
    clientId = await prompt('Masukkan Client ID     : ');
  } else {
    console.log(`Client ID terdeteksi dari .env: ${clientId}`);
    const useEnv = await prompt('Gunakan Client ID di atas? (Y/n) : ');
    if (useEnv.toLowerCase() === 'n') {
      clientId = await prompt('Masukkan Client ID baru : ');
    }
  }

  const clientSecret = await prompt('Masukkan Client Secret : ');

  if (!clientId || !clientSecret) {
    throw new Error('Client ID dan Client Secret wajib diisi.');
  }

  return { client_id: clientId, client_secret: clientSecret };
}

async function main() {
  const { client_id, client_secret } = await getClientCredentials();

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
    client_id,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file',
    access_type: 'offline',
    prompt: 'consent'
  }).toString();

  console.log('\n----------------------------------------------------------------');
  console.log('LANGKAH OTORISASI:');
  console.log('1. Server lokal SI-PRABU mendengarkan di: ' + REDIRECT_URI);
  console.log('2. Buka tautan berikut di browser Anda:');
  console.log('\n👉 ' + authUrl + '\n');
  console.log('3. Login dengan akun: datinkpungawi@gmail.com dan klik "Lanjutkan" / "Izinkan"');
  console.log('----------------------------------------------------------------\n');
  console.log('Menunggu persetujuan otentikasi dari browser...');

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
      if (reqUrl.pathname !== '/oauth2callback') {
        res.writeHead(404);
        return res.end('Not Found');
      }

      const code = reqUrl.searchParams.get('code');
      const errParam = reqUrl.searchParams.get('error');

      if (errParam) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h2>❌ Otorisasi Dibatalkan: ${errParam}</h2><p>Silakan tutup tab ini dan ulangi proses di terminal.</p>`);
        server.close();
        return reject(new Error('User menolak atau membatalkan izin: ' + errParam));
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h2>❌ Parameter code tidak ditemukan</h2>');
        server.close();
        return reject(new Error('Parameter code tidak ditemukan pada URL callback.'));
      }

      try {
        console.log('\n[INFO] Kode otorisasi diterima, menukar dengan Refresh Token...');
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id,
            client_secret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: REDIRECT_URI
          })
        });

        const tokens = await tokenRes.json();
        if (!tokens.refresh_token && !tokens.access_token) {
          throw new Error('Gagal mendapatkan token: ' + JSON.stringify(tokens));
        }

        const oauthPayload = {
          client_id,
          client_secret,
          refresh_token: tokens.refresh_token,
          access_token: tokens.access_token,
          expires_at: Math.floor(Date.now() / 1000) + (tokens.expires_in || 3600),
          updated_at: new Date().toISOString()
        };

        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(OAUTH_OUTPUT_FILE, JSON.stringify(oauthPayload, null, 2), 'utf8');

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <div style="font-family:sans-serif; text-align:center; padding:50px;">
            <h1 style="color:#16a34a;">✅ Otorisasi Google Drive Berhasil!</h1>
            <p style="font-size:16px; color:#334155;">Refresh Token telah berhasil disimpan ke <code>data/gdrive_oauth.json</code>.</p>
            <p style="color:#64748b;">Anda dapat menutup tab ini dan kembali ke terminal/chat.</p>
          </div>
        `);

        server.close();
        console.log(`\n🎉 SUKSES! File kredensial OAuth berhasil disimpan ke:`);
        console.log(`📁 ${OAUTH_OUTPUT_FILE}`);

        // Uji coba upload otomatis
        console.log('\n[UJI COBA] Melakukan uji coba upload ke Google Drive...');
        const { uploadBackupToGoogleDrive } = require('../src/backup');
        const testFilePath = path.join(DATA_DIR, 'test_oauth_backup.sql');
        fs.writeFileSync(testFilePath, `-- Test OAuth Backup SI-PRABU ${new Date().toISOString()}\nSELECT 1;\n`);

        try {
          const upRes = await uploadBackupToGoogleDrive(testFilePath, {
            folderId: FOLDER_ID,
            filename: `test_oauth_${Date.now()}.sql`
          });
          console.log('✅ Uji coba upload BERHASIL 100%!');
          console.log(`- File ID   : ${upRes.fileId}`);
          console.log(`- Nama File : ${upRes.name}`);
          console.log(`- Tautan    : ${upRes.webViewLink}`);
        } catch (upErr) {
          console.error('❌ Uji coba upload gagal:', upErr.message);
        } finally {
          if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
        }

        resolve(oauthPayload);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<h2>❌ Terjadi Kesalahan: ${err.message}</h2>`);
        server.close();
        reject(err);
      }
    });

    server.listen(PORT, () => {
      // server is ready
    });

    server.on('error', (e) => {
      reject(new Error(`Gagal membuka port ${PORT}: ${e.message}`));
    });
  });
}

main().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Setup Gagal:', err.message);
  process.exit(1);
});

