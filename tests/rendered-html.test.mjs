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

test("includes validated persistence, metadata, and a social card", async () => {
  const [route, schema, layout, hosting, migration] = await Promise.all([
    readFile(new URL("app/api/responses/route.ts", projectRoot), "utf8"),
    readFile(new URL("db/schema.ts", projectRoot), "utf8"),
    readFile(new URL("app/layout.tsx", projectRoot), "utf8"),
    readFile(new URL(".openai/hosting.json", projectRoot), "utf8"),
    readFile(
      new URL("drizzle/0000_regular_young_avengers.sql", projectRoot),
      "utf8",
    ),
  ]);

  assert.match(route, /export async function POST/);
  assert.match(route, /parsePayload/);
  assert.match(schema, /studyResponses/);
  assert.match(hosting, /"d1": "DB"/);
  assert.match(migration, /CREATE TABLE `study_responses`/);
  assert.match(layout, /CONFIIA \/ Study 01/);
  assert.match(layout, /\/og\.png/);
  await access(new URL("public/og.png", projectRoot));
});
