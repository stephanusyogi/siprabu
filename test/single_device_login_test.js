const assert = require('assert');
const { db, authenticateUser, authenticateGoogleUser, saveUser } = require('../src/db');
const { createToken, verifyToken } = require('../src/auth');

console.log('Testing Single-Device Login Enforcement...');

// 1. Create a test user
const testUsername = 'test_single_device_' + Date.now();
saveUser({
  username: testUsername,
  password: 'Password123!',
  nama_pejabat: 'Test Single Device User',
  email: `${testUsername}@gmail.com`,
  role_id: 'operator',
  level: 2,
  pic_subbag: 'TEKNIS',
  is_active: 1,
  role_mode: 'SWITCH'
});

// 2. Device A logs in
const userDevA = authenticateUser(testUsername, 'Password123!');
assert(userDevA, 'User must authenticate successfully on Device A');
const tokenDevA = createToken(userDevA);
const verifiedA1 = verifyToken(tokenDevA, db);
assert(verifiedA1, 'Device A token must be valid initially');
console.log('✅ Device A logged in with token version:', userDevA.token_version);

// 3. Device B logs in (same user, new device)
const userDevB = authenticateUser(testUsername, 'Password123!');
assert(userDevB, 'User must authenticate successfully on Device B');
assert(userDevB.token_version > userDevA.token_version, 'Device B must have incremented token version');
const tokenDevB = createToken(userDevB);
const verifiedB = verifyToken(tokenDevB, db);
assert(verifiedB, 'Device B token must be valid');
console.log('✅ Device B logged in with new token version:', userDevB.token_version);

// 4. Verify Device A is now kicked out (invalidated)
const verifiedA2 = verifyToken(tokenDevA, db);
assert.strictEqual(verifiedA2, null, 'Device A token MUST be rejected after Device B logged in');
console.log('✅ Device A token successfully invalidated (Single-Device Login enforced)!');

// 5. Google SSO Single-Device Login test
const userGoogleA = authenticateGoogleUser({ email: `${testUsername}@gmail.com`, sub: 'google_sub_test_1' });
assert(userGoogleA, 'Google SSO login 1 must succeed');
const tokenGoogleA = createToken(userGoogleA);
assert(verifyToken(tokenGoogleA, db), 'Google SSO Token A must be valid');

const userGoogleB = authenticateGoogleUser({ email: `${testUsername}@gmail.com`, sub: 'google_sub_test_1' });
assert(userGoogleB.token_version > userGoogleA.token_version, 'Google SSO login 2 must increment token version');
assert.strictEqual(verifyToken(tokenGoogleA, db), null, 'Previous Google SSO Token A must be invalidated');
console.log('✅ Google SSO Single-Device Login successfully verified!');

console.log('\n🎉 ALL SINGLE-DEVICE LOGIN TESTS PASSED 100%!');

