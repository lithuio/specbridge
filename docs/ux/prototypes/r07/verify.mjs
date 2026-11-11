/** Phase A prototype verification only. No API/DB/business E2E. */
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const toolRoot = process.env.R07_BROWSER_TOOLS;
if (!toolRoot) throw new Error('Set R07_BROWSER_TOOLS to an isolated directory with playwright and @axe-core/playwright installed.');
const requireTools = createRequire(join(resolve(toolRoot), 'package.json'));
const { chromium } = requireTools('playwright');
const { default: AxeBuilder } = requireTools('@axe-core/playwright');
const output = join(here, 'evidence');
await mkdir(output, { recursive: true });
const allowed = new Map([
  ['/index.html', 'text/html; charset=utf-8'],
  ['/tokens.css', 'text/css; charset=utf-8'],
  ['/prototype.css', 'text/css; charset=utf-8'],
  ['/prototype.js', 'text/javascript; charset=utf-8'],
]);
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/favicon.ico') { res.writeHead(204).end(); return; }
  const key = pathname === '/' ? '/index.html' : pathname;
  if (!allowed.has(key)) { res.writeHead(404).end(); return; }
  try {
    res.writeHead(200, { 'Content-Type': allowed.get(key), 'Cache-Control': 'no-store' });
    res.end(await readFile(join(here, key.slice(1))));
  } catch { res.writeHead(500).end(); }
});
await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
const origin = `http://127.0.0.1:${server.address().port}`;
const report = {
  generatedAt: new Date().toISOString(),
  scope: 'Phase A static visual prototype; no backend, database or authenticated workflow',
  tools: { playwright: requireTools('playwright/package.json').version, axe: JSON.parse(await readFile(join(resolve(toolRoot), 'node_modules/@axe-core/playwright/package.json'), 'utf8')).version },
  checks: [], violations: [], errors: [], screenshots: [],
};
let browser;
function record(name) { report.checks.push({ name, status: 'PASS' }); }
try {
  browser = await chromium.launch({ headless: true });
  report.browser = browser.version();
  const context = await browser.newContext({ locale: 'zh-CN', timezoneId: 'Asia/Shanghai', deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', (error) => report.errors.push(error.message));
  page.on('request', (req) => {
    if (!req.url().startsWith(origin) || req.url().includes('/api/')) report.errors.push(`Unexpected request: ${req.method()} ${req.url()}`);
  });
  for (const width of [1440, 1024, 768, 390, 320]) {
    for (const screen of ['login', 'dashboard', 'project']) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
      await page.goto(`${origin}/?page=${screen}`, { waitUntil: 'networkidle' });
      await page.locator('main').waitFor();
      await page.evaluate(() => document.fonts.ready);
      const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      assert.ok(dimensions.scroll <= dimensions.client + 1, `${screen} ${width}px horizontal overflow: ${JSON.stringify(dimensions)}`);
      record(`${screen} ${width}px no horizontal page overflow`);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      for (const violation of results.violations) report.violations.push({ screen, width, id: violation.id, impact: violation.impact, nodes: violation.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) });
      if (!results.violations.length) record(`${screen} ${width}px axe WCAG A/AA rules`);
      if (width === 1440 || width === 390) {
        const file = `${screen}-${width === 1440 ? 'desktop' : 'mobile'}.png`;
        await page.screenshot({ path: join(output, file), fullPage: true });
        report.screenshots.push(file);
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${origin}/?page=dashboard`);
  await page.getByRole('tab', { name: '待我处理' }).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.getByRole('tab', { name: '等待他人' }).getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('#task-panel .task').count(), 2);
  await page.keyboard.press('End');
  assert.equal(await page.getByRole('tab', { name: '已完成' }).getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('#task-panel .task').count(), 2);
  await page.keyboard.press('Home');
  assert.equal(await page.locator('#task-panel .task').count(), 3);
  record('Tabs support ArrowRight/Home/End and matching fixture counts');
  await page.getByRole('button', { name: '折叠侧栏' }).click();
  assert.equal(await page.getByRole('button', { name: '展开侧栏' }).getAttribute('aria-expanded'), 'false');
  const collapsed = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  assert.equal(collapsed.violations.length, 0, 'Collapsed nav accessibility');
  record('Sidebar collapse keeps accessible navigation');
  await page.setViewportSize({ width: 1024, height: 1000 });
  await page.goto(`${origin}/?page=dashboard`);
  const compactWidth = await page.locator('.sidebar').evaluate(el => el.getBoundingClientRect().width);
  await page.getByRole('button', { name: '展开侧栏' }).click();
  const expandedWidth = await page.locator('.sidebar').evaluate(el => el.getBoundingClientRect().width);
  assert.ok(expandedWidth > compactWidth, 'Tablet expand must change actual sidebar width');
  await page.getByRole('button', { name: '折叠侧栏' }).click();
  record('Tablet starts compact and can expand/collapse');
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const role of ['developer', 'client']) {
    await page.goto(`${origin}/?page=dashboard&role=${role}`);
    assert.equal(await page.locator('.sidebar').getByRole('link', { name: '供应方成员' }).count(), 0);
    const count = role === 'developer' ? 2 : 3;
    assert.equal(await page.locator('#task-panel .task').count(), count);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    assert.equal(results.violations.length, 0, `${role} view accessibility`);
    const file = `dashboard-${role}.png`;
    await page.screenshot({ path: join(output, file), fullPage: true });
    report.screenshots.push(file);
    record(`${role} fixture view has scoped navigation (not authorization evidence)`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/?page=project`);
  await page.getByRole('button', { name: '打开导航' }).click();
  assert.ok(await page.getByRole('dialog', { name: '主导航' }).isVisible());
  // Native modal dialog keeps sequential focus within its contents.
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press('Tab');
    assert.ok(await page.evaluate(() => document.getElementById('mobile-nav').contains(document.activeElement)));
  }
  await page.screenshot({ path: join(output, 'mobile-navigation.png'), fullPage: false });
  report.screenshots.push('mobile-navigation.png');
  await page.keyboard.press('Escape');
  assert.ok(await page.getByRole('button', { name: '打开导航' }).evaluate(el => el === document.activeElement));
  record('Mobile modal navigation traps focus and Escape restores trigger focus');
  await page.getByRole('button', { name: '查看冻结版本' }).click();
  assert.ok(await page.getByRole('dialog', { name: '这是设计评审原型' }).isVisible());
  await page.keyboard.press('Escape');
  record('Business controls disclose prototype boundary, no simulated mutation');
  await page.goto(`${origin}/?page=login`);
  await page.getByLabel('密码', { exact: true }).fill('design-sample-not-a-secret');
  await page.getByRole('button', { name: '显示密码' }).click();
  assert.equal(await page.getByLabel('密码', { exact: true }).getAttribute('type'), 'text');
  await page.getByRole('button', { name: '隐藏密码' }).click();
  await page.getByRole('button', { name: '登录', exact: true }).click();
  assert.ok(await page.getByRole('dialog', { name: '这是设计评审原型' }).isVisible());
  record('Password visibility control and design-only submit feedback');
  await page.keyboard.press('Escape');
  const tokenPairs = await page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    const luminance = (hex) => {
      const rgb = hex.trim().replace('#', '').match(/../g).map(v => parseInt(v, 16) / 255);
      const linear = rgb.map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
      return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
    };
    return [['ink','surface',4.5], ['muted','canvas',4.5], ['muted','surface',4.5], ['brand','surface',4.5], ['brand','brand-soft',4.5], ['success','success-bg',4.5], ['warning','warning-bg',4.5], ['danger','danger-bg',4.5], ['info','info-bg',4.5], ['input-border','surface',3]].map(([foreground,background,minimum]) => {
      const a = luminance(styles.getPropertyValue(`--${foreground}`));
      const b = luminance(styles.getPropertyValue(`--${background}`));
      return {foreground,background,minimum,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
    });
  });
  report.tokenContrast = tokenPairs;
  for (const pair of tokenPairs) assert.ok(pair.ratio >= pair.minimum, `Contrast ${pair.foreground}/${pair.background} ${pair.ratio}`);
  record('Ten semantic token contrast pairs meet text/control thresholds');
  assert.equal(report.errors.length, 0, JSON.stringify(report.errors));
  record('No page errors, external resources or API requests');
  assert.equal(report.violations.length, 0, `axe found ${report.violations.length} violations; see verification.json`);
} catch (error) {
  report.errors.push(error.message);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await new Promise(done => server.close(done));
  report.status = report.errors.length || report.violations.length ? 'FAIL' : 'PASS';
  await writeFile(join(output, 'verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(`${report.status}: ${report.checks.length} checks; ${report.violations.length} axe violations; ${report.screenshots.length} screenshots`);
  for (const error of report.errors) console.error(error);
}
