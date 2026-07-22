import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

test("implements the complete CONFIIA jsPsych study", async () => {
  const page = await readFile(new URL("app/page.tsx", projectRoot), "utf8");

  assert.match(page, /CONFIIA \/ Study 01/);
  assert.match(page, /Would you <em>trust<\/em> this system/);
  assert.match(page, /import\("jspsych"\)/);
  assert.match(page, /sampleWithoutReplacement/);
  assert.match(page, /frame_condition: condition/);
  assert.match(page, /primary_trust/);
  assert.match(page, /trust_index/);
  assert.match(page, /frame_recall/);
  assert.match(page, /sex_assigned_at_birth/);
  assert.match(page, /Another sex or intersex/);
  assert.match(page, /About 2 minutes/);
  assert.doesNotMatch(page, /codex-preview|SkeletonPreview|react-loading-skeleton/i);
});

test("keeps the one-sentence frames logically equivalent", async () => {
  const page = await readFile(new URL("app/page.tsx", projectRoot), "utf8");
  assert.match(
    page,
    /correctly identifies 90 out of every 100 cases reviewed by clinicians\./,
  );
  assert.match(
    page,
    /fails to identify 10 out of every 100 cases reviewed by clinicians\./,
  );
});

test("keeps the study controls fluid and touch-friendly on mobile", async () => {
  const [page, styles, html] = await Promise.all([
    readFile(new URL("app/page.tsx", projectRoot), "utf8"),
    readFile(new URL("app/globals.css", projectRoot), "utf8"),
    readFile(new URL("index.html", projectRoot), "utf8"),
  ]);

  assert.doesNotMatch(page, /scale_width:\s*760/);
  assert.equal(page.match(/grid_columns:\s*1/g)?.length, 2);
  assert.match(styles, /min-height:\s*100dvh/);
  assert.match(styles, /safe-area-inset-bottom/);
  assert.match(styles, /grid-template-columns:\s*minmax\(0, 1fr\) !important/);
  assert.match(styles, /width:\s*100% !important/);
  assert.match(html, /viewport-fit=cover/);
});

test("includes Google Sheets persistence, GitHub Pages deployment, and a social card", async () => {
  const [collector, html, workflow, viteConfig] = await Promise.all([
    readFile(new URL("google-apps-script/Code.gs", projectRoot), "utf8"),
    readFile(new URL("index.html", projectRoot), "utf8"),
    readFile(new URL(".github/workflows/deploy-pages.yml", projectRoot), "utf8"),
    readFile(new URL("vite.config.ts", projectRoot), "utf8"),
  ]);

  assert.match(collector, /function doPost/);
  assert.match(collector, /LockService\.getScriptLock/);
  assert.match(collector, /sex_assigned_at_birth/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(viteConfig, /confiia-ai-trust-framing-study/);
  assert.match(html, /CONFIIA \/ Study 01/);
  assert.match(html, /confiia-ai-trust-framing-study\/og\.png/);
  await access(new URL("public/og.png", projectRoot));
});
