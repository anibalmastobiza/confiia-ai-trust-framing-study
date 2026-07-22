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

The participant receives an anonymous code and can download the full local
jsPsych session as CSV or JSON. The debrief explains the framing manipulation
immediately after completion.

Entries from the unified CONFIIA recruitment page retain an anonymous recruitment
ID, source label, and assigned arm in both the summary row and local jsPsych data.
This supports an allocation-to-completion audit without collecting names or email
addresses.

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
