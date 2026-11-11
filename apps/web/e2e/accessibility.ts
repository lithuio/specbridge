import axe from "axe-core";
import type { Page } from "@playwright/test";
import { expect } from "./fixtures";

export async function accessibility(page: Page, name: string) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.addScriptTag({ content: axe.source });
  const result = await page.evaluate(async () => {
    const engine = (window as unknown as { axe: typeof axe }).axe;
    const result = await engine.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      },
    });
    // axe cannot infer colors for clipped navigation or overlapping dialog layers.
    // Verify their actual computed foreground / opaque ancestor backgrounds too;
    // retain the incomplete findings so this is not represented as an axe pass.
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d")!;
    const rgba = (color: string) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      return Array.from(ctx.getImageData(0, 0, 1, 1).data);
    };
    const blend = (front: number[], back: number[]) =>
      front
        .slice(0, 3)
        .map((c, i) => (c * front[3]) / 255 + back[i] * (1 - front[3] / 255));
    const luminance = (rgb: number[]) =>
      rgb
        .map((c) => c / 255)
        .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
        .reduce((n, c, i) => n + c * [0.2126, 0.7152, 0.0722][i], 0);
    const contrast = result.incomplete
      .filter((v) => v.id === "color-contrast")
      .flatMap((v) =>
        v.nodes.map((n) => {
          const el = document.querySelector(n.target[0] as string)!;
          const ancestors: Element[] = [];
          for (let at: Element | null = el; at; at = at.parentElement)
            ancestors.unshift(at);
          let background = [255, 255, 255];
          for (const ancestor of ancestors)
            background = blend(
              rgba(getComputedStyle(ancestor).backgroundColor),
              background,
            );
          const style = getComputedStyle(el);
          const foreground = blend(rgba(style.color), background);
          const [a, b] = [luminance(foreground), luminance(background)].sort(
            (x, y) => y - x,
          );
          const threshold =
            parseFloat(style.fontSize) >= 24 ||
            (parseFloat(style.fontSize) >= 18.66 &&
              Number(style.fontWeight) >= 700)
              ? 3
              : 4.5;
          return {
            target: n.target,
            ratio: Math.round(((a + 0.05) / (b + 0.05)) * 100) / 100,
            threshold,
          };
        }),
      );
    // Do not save DOM, form values or authentication data in evidence.
    return {
      violations: result.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
      passedRules: result.passes.length,
      supplementalComputedContrast: contrast,
      incomplete: result.incomplete.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    };
  });
  expect.soft(result.violations, name).toEqual([]);
  expect.soft(result.incomplete.filter(v => v.id === "aria-valid-attr-value"), `${name}: ARIA references`).toEqual([]);
  for (const check of result.supplementalComputedContrast)
    expect
      .soft(check.ratio, `${name}: ${check.target}`)
      .toBeGreaterThanOrEqual(check.threshold);
  expect
    .soft(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${name}: reflow`,
    )
    .toBe(true);
  return { name, ...result };
}
