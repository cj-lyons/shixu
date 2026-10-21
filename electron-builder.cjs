module.exports = {
  appId: 'cn.shixu.focus.desktop', productName: '拾序',
  directories: { app: 'desktop/app', output: 'desktop-release' },
  files: ['**/*'], asar: true,
  extraResources: [{ from: 'desktop/icon.ico', to: 'shixu.ico' }],
  win: { icon: 'desktop/icon.ico', target: [{ target: 'nsis', arch: ['x64'] }, { target: 'portable', arch: ['x64'] }], artifactName: 'Shixu-${version}-${arch}-Setup.${ext}', signAndEditExecutable: true },
  nsis: { oneClick: false, perMachine: false, allowElevation: false, allowToChangeInstallationDirectory: true, createDesktopShortcut: true, createStartMenuShortcut: true, shortcutName: '拾序', deleteAppDataOnUninstall: false, installerLanguages: ['zh_CN', 'en_US'], language: '2052' },
  portable: { artifactName: 'Shixu-${version}-${arch}-Portable.${ext}' }
};
