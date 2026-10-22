import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

const projectRoot = new URL("../", import.meta.url);
const recruitmentSource = await readFile(new URL("app/recruitment.ts", projectRoot), "utf8");
const recruitmentJs = ts.transpileModule(recruitmentSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { readRecruitmentMetadata } = await import(
  `data:text/javascript;base64,${Buffer.from(recruitmentJs).toString("base64")}`
);
const prolificSource = await readFile(new URL("app/prolific.ts", projectRoot), "utf8");
const prolificJs = ts.transpileModule(prolificSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { getProlificCompletion } = await import(
  `data:text/javascript;base64,${Buffer.from(prolificJs).toString("base64")}`
);
const collectorSource = await readFile(new URL("google-apps-script/Code.gs", projectRoot), "utf8");
const studyId = "confiia_ai_trust_one_sentence_frame";
const prolificStudyId = "6ad9d45f58c16fdff07d80eb";
const prolificCompletionCode = "C16ZE7NM";
const prolificCompletionUrl = "https://app.prolific.com/submissions/complete?cc=C16ZE7NM";

test("direct and router entries preserve old metadata with empty Prolific identifiers", () => {
  assert.deepEqual(readRecruitmentMetadata(""), {
    recruitment_id: "", recruitment_source: "", assigned_study: "",
    prolific_pid: "", prolific_study_id: "", prolific_session_id: "",
  });
  assert.deepEqual(readRecruitmentMetadata("?rid=route-1&source=confiia-unified-recruitment&assigned_study=study01"), {
    recruitment_id: "route-1", recruitment_source: "confiia-unified-recruitment", assigned_study: "study01",
    prolific_pid: "", prolific_study_id: "", prolific_session_id: "",
  });
});

test("Prolific identifiers decode once, remain strings, and coexist with existing metadata", () => {
  const metadata = readRecruitmentMetadata("?PROLIFIC_PID=0012%2Bxy%2520&STUDY_ID=study%2F4&SESSION_ID=session+two&rid=route%2B1&source=explicit&assigned_study=study01");
  assert.deepEqual(metadata, {
    recruitment_id: "route+1", recruitment_source: "explicit", assigned_study: "study01",
    prolific_pid: "0012+xy%20", prolific_study_id: "study/4", prolific_session_id: "session two",
  });
  assert.equal(readRecruitmentMetadata("?PROLIFIC_PID=00123").recruitment_source, "prolific");
  assert.equal(readRecruitmentMetadata("?STUDY_ID=study-only").recruitment_source, "");
});

test("metadata is bounded and accepts only the supported router assignments", () => {
  const long = "x".repeat(300);
  const metadata = readRecruitmentMetadata(`?PROLIFIC_PID=${long}&STUDY_ID=${long}&SESSION_ID=${long}&rid=${long}&source=${long}&assigned_study=other`);
  for (const key of ["prolific_pid", "prolific_study_id", "prolific_session_id", "recruitment_id"]) {
    assert.equal(metadata[key].length, 128);
  }
  assert.equal(metadata.recruitment_source.length, 80);
  assert.equal(metadata.assigned_study, "");
  assert.equal(readRecruitmentMetadata("?assigned_study=study02").assigned_study, "study02");
});

for (const shouldFail of [false, true]) {
test(`the study preserves its captured snapshot and completion when submission ${shouldFail ? "fails" : "succeeds"}`, async () => {
  const pageSource = await readFile(new URL("app/page.tsx", projectRoot), "utf8");
  const compiled = ts.transpileModule(pageSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const initialSearch = `?PROLIFIC_PID=person-001&STUDY_ID=${prolificStudyId}&SESSION_ID=session-1&rid=route-1&source=custom&assigned_study=study01`;
  const fakeWindow = { location: { search: initialSearch }, setTimeout: (callback) => callback() };
  let startStudy;
  let finishStudy;
  let trialProperties;
  let timeline;
  let payload;
  let completion;
  let refCount = 0;
  let uuidCount = 0;
  let fetchCalls = 0;
  const states = [];
  const fakeData = {
    values: () => [],
    csv: () => "jsPsych CSV export",
    json: () => "jsPsych JSON export",
  };
  const jsPsych = {
    version: () => "test-jspsych",
    randomization: { sampleWithoutReplacement: (values) => [values[0]], shuffle: (values) => values },
    data: { addProperties: (properties) => { trialProperties = properties; }, get: () => fakeData },
    run: (trials) => { timeline = trials; },
  };
  const modules = {
    react: {
      useState: (initial) => [initial, (value) => { if (typeof value === "string") states.push(value); else completion = value; }],
      useRef: (initial) => ({ current: refCount++ === 0 ? {} : initial }),
      useCallback: (callback) => { startStudy = callback; return callback; },
      useEffect: () => {},
    },
    "react/jsx-runtime": { jsx: () => null, jsxs: () => null },
    "./recruitment": { readRecruitmentMetadata },
    "./prolific": { getProlificCompletion },
    jspsych: { initJsPsych: (options) => { finishStudy = options.on_finish; return jsPsych; } },
    "@jspsych/plugin-html-button-response": { default: "button" },
    "@jspsych/plugin-survey-likert": { default: "likert" },
    "@jspsych/plugin-survey-multi-choice": { default: "choice" },
  };
  const context = vm.createContext({
    exports: {}, window: fakeWindow, console: { error: () => {} },
    crypto: { randomUUID: () => `0000000${++uuidCount}-0000-0000-0000-000000000000` },
    require: (name) => { assert.ok(Object.hasOwn(modules, name), `Unexpected module ${name}`); return modules[name]; },
    fetch: async (_url, options) => {
      fetchCalls++;
      payload = JSON.parse(options.body);
      if (shouldFail) throw new Error("Simulated network failure");
    },
  });
  vm.runInContext(compiled, context);
  context.exports.default();
  await startStudy();
  assert.equal(timeline.length, 6);
  assert.match(timeline[0].stimulus, /identifiers supplied by Prolific are stored with your responses/);
  fakeWindow.location.search = "?PROLIFIC_PID=changed&STUDY_ID=changed&SESSION_ID=changed";
  finishStudy();
  await new Promise((resolve) => setImmediate(resolve));
  const expected = readRecruitmentMetadata(initialSearch);
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(trialProperties[key], value, `jsPsych property ${key}`);
    assert.equal(payload[key], value, `collector payload ${key}`);
  }
  assert.equal(payload.study_id, studyId);
  assert.equal(trialProperties.study_id, studyId);
  assert.match(payload.participant_id, /^CONFIIA-/);
  assert.notEqual(payload.participant_id, payload.prolific_pid);
  assert.equal(payload.study_version, "1.2.4");
  assert.equal(completion.csv, fakeData.csv());
  assert.equal(completion.json, fakeData.json());
  assert.equal(completion.prolificCompletion.code, prolificCompletionCode);
  assert.equal(completion.prolificCompletion.url, prolificCompletionUrl);
  assert.equal(completion.submissionStatus, shouldFail ? "failed" : "sent");
  assert.equal(fetchCalls, shouldFail ? 2 : 1);
  assert.deepEqual(states, ["saving", "complete"]);
});
}

test("Prolific completion requires a participant ID and the exact configured study ID", () => {
  assert.deepEqual(getProlificCompletion({ prolific_pid: "person", prolific_study_id: prolificStudyId }), {
    code: prolificCompletionCode, url: prolificCompletionUrl,
  });
  for (const metadata of [
    { prolific_pid: "", prolific_study_id: prolificStudyId },
    { prolific_pid: "person", prolific_study_id: "" },
    { prolific_pid: "person", prolific_study_id: "other-study" },
    { prolific_pid: "person", prolific_study_id: prolificStudyId.toUpperCase() },
    { prolific_pid: "person", prolific_study_id: `${prolificStudyId}extra` },
  ]) {
    assert.equal(getProlificCompletion(metadata), null);
  }
});

async function renderCompletion(search, submissionStatus) {
  const pageSource = await readFile(new URL("app/page.tsx", projectRoot), "utf8");
  const compiled = ts.transpileModule(pageSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const completion = {
    participantId: "CONFIIA-LOCAL", csv: "local csv", json: "local json", submissionStatus,
    prolificCompletion: getProlificCompletion(readRecruitmentMetadata(search)),
  };
  const modules = {
    react: {
      useState: (initial) => [initial === "landing" ? "complete" : completion, () => {}],
      useRef: (initial) => ({ current: initial }),
      useCallback: (callback) => callback,
      useEffect: () => {},
    },
    "react/jsx-runtime": jsxRuntime,
    "./recruitment": { readRecruitmentMetadata },
    "./prolific": { getProlificCompletion },
  };
  const context = vm.createContext({
    exports: {},
    require: (name) => { assert.ok(Object.hasOwn(modules, name), `Unexpected module ${name}`); return modules[name]; },
  });
  vm.runInContext(compiled, context);
  return renderToStaticMarkup(context.exports.default());
}

test("completion renders the correct return link and separate code after the debrief, including failed submissions", async () => {
  for (const status of ["sent", "failed"]) {
    const html = await renderCompletion(`?PROLIFIC_PID=person&STUDY_ID=${prolificStudyId}`, status);
    assert.ok(html.includes(`href="${prolificCompletionUrl}"`));
    assert.match(html, /Return to Prolific/);
    assert.match(html, /Prolific completion code<\/span><strong>C16ZE7NM/);
    assert.match(html, /Your session code<\/span><strong>CONFIIA-LOCAL/);
    assert.ok(html.indexOf("Why this matters") < html.indexOf("Prolific completion code"));
    assert.match(html, /Download CSV/);
    assert.match(html, /Download JSON/);
    assert.doesNotMatch(html, /Response submitted successfully|stored successfully|http-equiv="refresh"/);
    if (status === "failed") {
      assert.match(html, /could not confirm that your response was sent/);
      assert.doesNotMatch(html, /Your response was sent\./);
    } else {
      assert.match(html, /Your response was sent\./);
    }
  }
});

test("direct visits, missing participant IDs and other studies do not render a Prolific completion", async () => {
  for (const search of ["", `?STUDY_ID=${prolificStudyId}`, "?PROLIFIC_PID=person&STUDY_ID=other-study"]) {
    const html = await renderCompletion(search, "sent");
    assert.doesNotMatch(html, /Return to Prolific|C16ZE7NM|submissions\/complete/);
    assert.match(html, /CONFIIA-LOCAL/);
  }
});

function collectorHarness(initialRows = [], initialCapacity = 26) {
  const rows = initialRows.map((row) => [...row]);
  let releases = 0;
  let capacity = initialCapacity;
  const sheet = {
    getName: () => "Responses",
    getLastRow: () => rows.length,
    getLastColumn: () => Math.max(0, ...rows.map((row) => row.length)),
    getMaxColumns: () => capacity,
    insertColumnsAfter: (column, count) => {
      assert.equal(column, capacity);
      capacity += count;
    },
    setFrozenRows: () => {},
    autoResizeColumns: () => {},
    appendRow: (row) => rows.push(Array.from(row)),
    getRange(row, column, rowCount, columnCount) {
      assert.ok(column + columnCount - 1 <= capacity, "Range exceeds allocated sheet columns");
      const range = {
        getValues: () => Array.from({ length: rowCount }, (_, r) =>
          Array.from({ length: columnCount }, (_, c) => rows[row - 1 + r]?.[column - 1 + c] ?? "")),
        setValues: (values) => {
          values.forEach((valuesRow, r) => valuesRow.forEach((value, c) => {
            rows[row - 1 + r] ??= [];
            rows[row - 1 + r][column - 1 + c] = value;
          }));
          return range;
        },
        setFontWeight: () => range,
        setBackground: () => range,
        setFontColor: () => range,
        createTextFinder: (value) => {
          const finder = {
            matchEntireCell: () => finder,
            findNext: () => range.getValues().flat().some((cell) => String(cell) === value) ? {} : null,
          };
          return finder;
        },
      };
      return range;
    },
  };
  const context = vm.createContext({
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet, insertSheet: () => sheet }) },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => { releases++; } }) },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: (body) => ({ body, setMimeType() { return this; } }),
    },
  });
  vm.runInContext(collectorSource, context);
  return {
    rows,
    headers: Array.from(vm.runInContext("HEADERS", context)),
    post: (payload) => JSON.parse(context.doPost({ postData: { contents: JSON.stringify(payload) } }).body),
    setup: () => context.setupResponses(),
    releases: () => releases,
    capacity: () => capacity,
  };
}

test("the collector appends Prolific headers to the old schema and preserves rows and duplicates", () => {
  const headers = collectorHarness().headers;
  assert.deepEqual(headers.slice(-3), ["prolific_pid", "prolific_study_id", "prolific_session_id"]);
  const oldHeaders = headers.slice(0, -3);
  const oldRow = oldHeaders.map((header) => header === "submission_id" ? "old-submission" : `old-${header}`);
  const harness = collectorHarness([oldHeaders, oldRow], oldHeaders.length);
  const metadata = readRecruitmentMetadata("?PROLIFIC_PID=00123&STUDY_ID=prolific-study&SESSION_ID=session-1&rid=route-1");
  const payload = { study_id: studyId, submission_id: "new-submission", participant_id: "CONFIIA-TEST", ...metadata };
  assert.deepEqual(harness.post(payload), { ok: true, duplicate: false });
  assert.deepEqual(harness.rows[0], headers);
  assert.equal(harness.capacity(), headers.length);
  assert.deepEqual(harness.rows[1], oldRow);
  for (const [key, value] of Object.entries(payload)) {
    assert.equal(harness.rows[2][headers.indexOf(key)], value);
  }
  const afterFirstPost = structuredClone(harness.rows);
  assert.deepEqual(harness.post(payload), { ok: true, duplicate: true });
  assert.deepEqual(harness.post({ ...payload, submission_id: "old-submission" }), { ok: true, duplicate: true });
  assert.deepEqual(harness.rows, afterFirstPost);
  assert.equal(harness.releases(), 3);
});

test("fresh and pre-Prolific requests remain valid and absent identifiers become blank cells", () => {
  const harness = collectorHarness();
  assert.deepEqual(harness.post({ study_id: studyId, submission_id: "direct" }), { ok: true, duplicate: false });
  assert.deepEqual(harness.rows[1].slice(-3), ["", "", ""]);
  assert.equal(harness.setup(), "Responses");
  assert.equal(harness.rows.length, 2);
});

test("unexpected header order causes no sheet writes and formula-like identifiers stay text", () => {
  const headers = collectorHarness().headers;
  const oldHeaders = headers.slice(0, -3);
  [oldHeaders[0], oldHeaders[1]] = [oldHeaders[1], oldHeaders[0]];
  const rows = [oldHeaders, oldHeaders.map(() => "preserve")];
  const harness = collectorHarness(rows, oldHeaders.length);
  const result = harness.post({ study_id: studyId, submission_id: "new" });
  assert.equal(result.ok, false);
  assert.match(result.error, /headers do not match/);
  assert.deepEqual(harness.rows, rows);
  assert.equal(harness.capacity(), oldHeaders.length);
  assert.equal(harness.releases(), 1);
  const fresh = collectorHarness();
  fresh.post({ study_id: studyId, submission_id: "new", prolific_pid: "=1+1" });
  assert.equal(fresh.rows[1][headers.indexOf("prolific_pid")], "'=1+1");
});
