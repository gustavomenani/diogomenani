import { test } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

/** Intervalos entre quadros (ms) de `count` quadros seguidos. */
async function frameIntervals(page: import('@playwright/test').Page, count = 40) {
  return page.evaluate(async (n) => {
    const times: number[] = [];
    await new Promise<void>((resolve) => {
      const tick = (t: number) => {
        times.push(t);
        if (times.length < n) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    return times.slice(1).map((t, i) => t - (times[i] ?? t));
  }, count);
}

function describe(intervals: number[]) {
  const sorted = [...intervals].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;
  return `mediana ${at(0.5).toFixed(1)} ms, p90 ${at(0.9).toFixed(1)} ms, max ${at(1).toFixed(1)} ms`;
}

test('fps no topo, nas etapas e durante a troca de tema', async ({ page, browserName }) => {
  await page.goto('/');
  await page.waitForTimeout(1500);
  console.log(`[fps] ${browserName} topo: ${describe(await frameIntervals(page))}`);
  await page.evaluate(() => document.getElementById('tema-previdenciario')?.click());
  console.log(`[fps] ${browserName} troca: ${describe(await frameIntervals(page, 30))}`);
  await page.evaluate(() =>
    document.getElementById('como-trabalhamos')?.scrollIntoView({ behavior: 'instant' }),
  );
  await page.waitForTimeout(1500);
  console.log(`[fps] ${browserName} etapas: ${describe(await frameIntervals(page))}`);
  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return {
      dcl: Math.round(nav.domContentLoadedEventEnd),
      load: Math.round(nav.loadEventEnd),
      fonts: document.fonts.status,
    };
  });
  console.log(`[tempo] ${browserName} ${JSON.stringify(timing)}`);
});
