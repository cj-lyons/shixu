const assert = require('node:assert/strict');
const { canStoreSecrets, runtimeIconFile } = require('../desktop/platform.cjs');
const storage = (available, backend) => ({ isEncryptionAvailable: () => available, getSelectedStorageBackend: () => backend });
assert.equal(canStoreSecrets(storage(true, 'basic_text'), 'linux'), false);
assert.equal(canStoreSecrets(storage(true, 'gnome_libsecret'), 'linux'), true);
assert.equal(canStoreSecrets(storage(true, 'kwallet6'), 'linux'), true);
assert.equal(canStoreSecrets(storage(false, 'unknown'), 'linux'), false);
assert.equal(canStoreSecrets(storage(true, 'basic_text'), 'win32'), true);
for (const platform of ['win32', 'darwin', 'linux']) {
  assert.equal(runtimeIconFile(true, platform), platform === 'win32' ? 'shixu.ico' : 'shixu.png');
  assert.equal(runtimeIconFile(false, platform), platform === 'win32' ? 'icon.ico' : 'icon.png');
}
console.log('Platform icon selection and Linux keyring boundary checks passed.');
