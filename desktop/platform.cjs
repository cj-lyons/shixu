function canStoreSecrets(storage, platform = process.platform) {
  return storage.isEncryptionAvailable() && (platform !== 'linux' || storage.getSelectedStorageBackend() !== 'basic_text');
}
function runtimeIconFile(packaged, platform = process.platform) {
  const ext = platform === 'win32' ? 'ico' : 'png';
  return (packaged ? 'shixu.' : 'icon.') + ext;
}
module.exports = { canStoreSecrets, runtimeIconFile };
