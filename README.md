# CONFIIA / Study 01 — One-sentence framing and trust in medical AI

An English-language, randomized between-subjects jsPsych study of whether a
logically equivalent gain or loss frame changes trust in an AI-assisted
diagnostic system. The participant journey is designed to take about two
minutes and remain below three minutes.

## Experimental contrast

- **Gain frame:** “An AI-assisted diagnostic system correctly identifies 90
  out of every 100 cases reviewed by clinicians.”
- **Loss frame:** “An AI-assisted diagnostic system fails to identify 10 out
  of every 100 cases reviewed by clinicians.”

Assignment is random with equal probability. The two stimuli each consist of a
single sentence and communicate the same performance rate.

## Outcomes

1. **Primary outcome:** seven-point agreement with trusting the system to
   support a clinician’s decision.
2. **Secondary trust items:** comfort with use in one’s care and perceived
   reliability; the mean of all three items is saved as `trust_index` (0–6).
3. **Reliance choice:** whether a clinician should give more weight to their
   own judgment, equal weight to both, or more weight to the AI.
4. **Manipulation check:** recognition of the gain or loss sentence.
5. **Background:** stakeholder perspective, familiarity with health AI, and
   sex assigned at birth (with a prefer-not-to-answer option).

Response times, randomized option order, study version, and jsPsych version are
also stored. The app requests no name, email, IP address, or free-text response.

## Data collection

Completed summary rows are sent to a Google Apps Script web app and appended to
the private Google Sheet
[CONFIIA — AI Trust Framing Study Responses](https://docs.google.com/spreadsheets/d/1zQQUAwmle48n9EpFc3W7czXHZ687-pss_ggglCbKtgM/edit).
The collector validates the study identifier, prevents duplicate submissions,
serializes concurrent writes, and neutralizes spreadsheet formulas. Its source
is versioned in [`google-apps-script/Code.gs`](google-apps-script/Code.gs).

The participant receives a session code and can download the full local
jsPsych session as CSV or JSON. The debrief explains the framing manipulation
immediately after completion.

Entries from the unified CONFIIA recruitment page retain an anonymous recruitment
ID, source label, and assigned arm in both the summary row and local jsPsych data.
This supports an allocation-to-completion audit without collecting names or email
addresses.

## Independent Prolific recruitment

In Prolific, select participant identification through URL parameters and use
the direct Study 01 URL:

```text
https://anibalmastobiza.github.io/confiia-ai-trust-framing-study/?PROLIFIC_PID={{%PROLIFIC_PID%}}&STUDY_ID={{%STUDY_ID%}}&SESSION_ID={{%SESSION_ID%}}
```

Prolific replaces the placeholders for each participant. Do not replace them
with the workspace ID or share a participant's populated URL. The app captures
the parameters once when the session starts and stores them as `prolific_pid`,
`prolific_study_id`, and `prolific_session_id` in the summary row and each local
jsPsych record exported to CSV or JSON. These fields are separate from CONFIIA's
internal `participant_id`, `study_id`, and `submission_id`. Values are limited
to 128 characters. This records the supplied identifiers; it does not authenticate
them against the Prolific API.

If a Prolific participant ID is present and no source label was supplied,
`recruitment_source` is set to `prolific`. Existing `rid`, `source`, and
`assigned_study` parameters remain supported. Direct visits without Prolific
parameters continue to work and leave the three Prolific fields empty.

Deploy the updated `google-apps-script/Code.gs` to the existing Apps Script web
app before collecting Prolific responses. Updating GitHub Pages alone does not
update that collector. Run `setupResponses()` to append the three new headers,
or let the first submission perform the same migration. Existing rows and
column order are preserved; an unexpected header order stops writes instead
of misaligning responses. Publish a new version of the existing web-app
deployment so its endpoint remains unchanged.

The completion configuration in `app/prolific.ts` is linked to Prolific study
`6ad9d45f58c16fdff07d80eb`, with completion code `C16ZE7NM` and return URL
`https://app.prolific.com/submissions/complete?cc=C16ZE7NM`. After the debrief,
participants whose captured entry parameters include a participant ID and this
exact study ID see a return button and the code for manual entry. There is no
automatic redirect. The return remains available if the response submission
attempt fails, alongside the warning and local downloads. The CONFIIA session
code is displayed separately and is not a Prolific completion code.

If the Prolific announcement is duplicated or replaced, update both constants
in `app/prolific.ts` with the new study ID and completion code, test the entry
and completion flow, and redeploy GitHub Pages before recruiting. Verify that
a test session's three IDs reach Google Sheets and match the local exports.
The current
`no-cors` submission transport does not expose the collector's response body;
its successful resolution alone does not verify that a row was saved.

## Development and publication

```bash
npm install
npm run dev
npm test
```

Every push to `main` builds the static Vite/jsPsych app and publishes it with
GitHub Actions to
`https://anibalmastobiza.github.io/confiia-ai-trust-framing-study/`.

## Research use

The participant-facing copy describes this as a research pilot and does not
claim ethics approval. Before recruitment, replace the consent and contact text
with the institution-approved protocol and confirm the retention, withdrawal,
and data-protection procedures.

The implementation follows the official [jsPsych 8 documentation](https://www.jspsych.org/latest/).

## Participant information update, 22 October 2026

Version 1.2.4 identifies the diagnostic system and its performance figures as
fictional research examples in the consent and debrief; the landing page describes
a hypothetical system. The two framing sentences, randomization, questions,
collection schema and Prolific completion configuration are unchanged. Historical
responses are preserved and remain available for the combined analysis requested
by the researcher.
