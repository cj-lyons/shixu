module.exports = {
  appId: 'cn.shixu.focus.desktop', productName: '拾序',
  directories: { app: 'desktop/app', output: 'desktop-release' },
  files: ['**/*', '!node_modules/**/*'], asar: true,
  extraResources: [{ from: 'desktop/icon.png', to: 'shixu.png' }],
  win: { extraResources: [{ from: 'desktop/icon.ico', to: 'shixu.ico' }], icon: 'desktop/icon.ico', target: [{ target: 'nsis', arch: ['x64'] }, { target: 'portable', arch: ['x64'] }], artifactName: 'Shixu-${version}-${arch}-Setup.${ext}', signAndEditExecutable: true },
  linux: { icon: 'desktop/icon.png', target: ['AppImage', 'deb'], category: 'Office', executableName: 'shixu', maintainer: 'CheJ', artifactName: 'Shixu-${version}-linux-${arch}.${ext}' },
  mac: { icon: 'desktop/icon.png', target: ['dmg', 'zip'], category: 'public.app-category.productivity', identity: null, hardenedRuntime: false, notarize: false, artifactName: 'Shixu-${version}-mac-${arch}.${ext}' },
  nsis: { oneClick: false, perMachine: false, allowElevation: false, allowToChangeInstallationDirectory: true, createDesktopShortcut: true, createStartMenuShortcut: true, shortcutName: '拾序', deleteAppDataOnUninstall: false, installerLanguages: ['zh_CN', 'en_US'], language: '2052' },
  portable: { artifactName: 'Shixu-${version}-${arch}-Portable.${ext}' }
};
