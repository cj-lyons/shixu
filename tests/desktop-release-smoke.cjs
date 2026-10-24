const fs = require('node:fs');
const path = require('node:path');
const { _electron } = require('playwright');
const executablePath = process.argv[2];
if (!executablePath) throw Error('Pass the packaged executable');
const profile = path.resolve('output/release-smoke-' + process.platform + '-' + process.arch);
fs.mkdirSync(path.resolve('output'), { recursive: true });
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
const checks = [], errors = [];
let desktop;
const launch = async () => {
  desktop = await _electron.launch({ executablePath, env, timeout: 45000,
    // Only the disposable hosted Linux CI VM uses this switch; it is never in a shipped launcher.
    args: ['--shixu-profile=' + profile, '--shixu-port=18759', ...(process.platform === 'linux' && process.env.CI ? ['--no-sandbox'] : [])] });
  const page = await desktop.firstWindow();
  page.on('pageerror', e => errors.push(e.message));
  await page.getByRole('button', { name: '记一件事', exact: true }).waitFor();
  return page;
};
(async () => {
  let page = await launch();
  const info = await desktop.evaluate(({ app }) => ({ packaged: app.isPackaged, version: app.getVersion(), arch: process.arch, platform: process.platform }));
  if (!info.packaged || info.version !== require('../package.json').version) throw Error('Wrong build');
  await page.getByRole('button', { name: '记一件事', exact: true }).click();
  await page.getByLabel('事项内容', { exact: true }).fill('跨平台发行包测试任务');
  await page.getByRole('button', { name: '保存事项', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  const read = () => page.evaluate(async () => (await fetch('/api/workspace')).json());
  if (!(await read()).data.tasks.some(t => t.title === '跨平台发行包测试任务')) throw Error('Task save failed');
  checks.push('Packaged executable and native SQLite task save');
  await page.locator('.timer-controls .primary').click();
  await page.waitForFunction(async () => !!(await window.shixuDesktop.getReminderState()).timer?.end);
  await page.locator('.timer-controls .primary').click();
  await page.waitForFunction(async () => !(await window.shixuDesktop.getReminderState()).timer?.end);
  checks.push('Focus start and pause bridge');
  await page.locator('.theme-picker summary').click();
  await page.getByRole('button', { name: /郁金香，/ }).click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'tulip');
  await page.screenshot({ path: path.resolve('output/release-smoke-' + process.platform + '-' + process.arch + '.png') });
  checks.push('Flower theme switching');
  await desktop.close(); desktop = null;
  page = await launch();
  if (!(await read()).data.tasks.some(t => t.title === '跨平台发行包测试任务')) throw Error('Task lost on restart');
  checks.push('Saved task survives full restart');
  if (errors.length) throw Error(errors.join('; '));
  const report = { passed: true, ...info, checks, limits: ['No real cloud credentials or physical-user-device tests', 'Linux CI uses Xvfb and test-only no-sandbox; desktop environment integration still requires user testing'] };
  fs.writeFileSync(path.resolve('output/release-smoke-' + process.platform + '-' + process.arch + '.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { if (desktop) await desktop.close(); });
