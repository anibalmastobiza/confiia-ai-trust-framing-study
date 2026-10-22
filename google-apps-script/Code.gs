const SPREADSHEET_ID = "1zQQUAwmle48n9EpFc3W7czXHZ687-pss_ggglCbKtgM";
const SHEET_NAME = "Responses";
const STUDY_ID = "confiia_ai_trust_one_sentence_frame";

const HEADERS = [
  "server_received_utc",
  "study_id",
  "study_version",
  "submission_id",
  "participant_id",
  "jspsych_version",
  "session_started_utc",
  "session_completed_utc",
  "frame_condition",
  "primary_trust",
  "comfort_with_use",
  "perceived_reliability",
  "trust_index",
  "reliance_choice",
  "reliance_order",
  "recalled_frame",
  "recall_correct",
  "recall_order",
  "stakeholder_role",
  "health_ai_familiarity",
  "sex_assigned_at_birth",
  "consent_rt_ms",
  "frame_rt_ms",
  "trust_rt_ms",
  "reliance_rt_ms",
  "recall_rt_ms",
  "background_rt_ms",
  "total_elapsed_ms",
  "recruitment_id",
  "recruitment_source",
  "assigned_study",
  "prolific_pid",
  "prolific_study_id",
  "prolific_session_id",
];

function doGet() {
  return jsonResponse_({
    ok: true,
    study_id: STUDY_ID,
    message: "CONFIIA response collector is running.",
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Missing request body.");
    }

    const payload = JSON.parse(e.postData.contents);
    if (payload.study_id !== STUDY_ID) {
      throw new Error("Unknown study_id.");
    }
    if (!payload.submission_id) {
      throw new Error("Missing submission_id.");
    }

    const sheet = getResponseSheet_();
    const submissionColumn = HEADERS.indexOf("submission_id") + 1;
    const existingRows = sheet.getLastRow() - 1;

    if (existingRows > 0) {
      const duplicate = sheet
        .getRange(2, submissionColumn, existingRows, 1)
        .createTextFinder(String(payload.submission_id))
        .matchEntireCell(true)
        .findNext();

      if (duplicate) {
        return jsonResponse_({ ok: true, duplicate: true });
      }
    }

    const record = Object.assign(
      { server_received_utc: new Date().toISOString() },
      payload,
    );
    sheet.appendRow(
      HEADERS.map(function (header) {
        return safeCell_(record[header]);
      }),
    );

    return jsonResponse_({ ok: true, duplicate: false });
  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: error && error.message ? error.message : String(error),
    });
  } finally {
    lock.releaseLock();
  }
}

function setupResponses() {
  return getResponseSheet_().getName();
}

function getResponseSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    ensureColumnCapacity_(sheet);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    sheet
      .getRange(1, 1, 1, HEADERS.length)
      .setFontWeight("bold")
      .setBackground("#15302b")
      .setFontColor("#ffffff");
    sheet.autoResizeColumns(1, HEADERS.length);
  } else {
    const existingColumnCount = Math.min(sheet.getLastColumn(), HEADERS.length);
    const existingHeaders = sheet
      .getRange(1, 1, 1, existingColumnCount)
      .getValues()[0];
    if (existingHeaders.some(function (header, index) {
      return header !== HEADERS[index];
    })) {
      throw new Error("Response sheet headers do not match the expected order. No data was written.");
    }

    if (sheet.getLastColumn() < HEADERS.length) {
      const firstNewColumn = sheet.getLastColumn() + 1;
      const missingHeaders = HEADERS.slice(firstNewColumn - 1);
      ensureColumnCapacity_(sheet);
      sheet
        .getRange(1, firstNewColumn, 1, missingHeaders.length)
        .setValues([missingHeaders])
        .setFontWeight("bold")
        .setBackground("#15302b")
        .setFontColor("#ffffff");
      sheet.autoResizeColumns(firstNewColumn, missingHeaders.length);
    }
  }

  return sheet;
}

function ensureColumnCapacity_(sheet) {
  const currentColumns = sheet.getMaxColumns();
  if (currentColumns < HEADERS.length) {
    sheet.insertColumnsAfter(currentColumns, HEADERS.length - currentColumns);
  }
}

function safeCell_(value) {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string" && /^[=+\-@]/.test(value)) {
    return "'" + value;
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return value;
}

function jsonResponse_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
