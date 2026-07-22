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
5. **Background:** stakeholder perspective and familiarity with health AI.

Response times, randomized option order, study version, and jsPsych version are
also stored. The app requests no name, email, IP address, or free-text response.

## Data collection

Completed summary rows are written to a private Cloudflare D1 table through a
validated same-origin endpoint. The participant receives an anonymous code and
can download the full local jsPsych session as CSV or JSON. The debrief explains
the framing manipulation immediately after completion.

## Research use

The participant-facing copy describes this as a research pilot and does not
claim ethics approval. Before recruitment, replace the consent and contact text
with the institution-approved protocol and confirm the retention, withdrawal,
and data-protection procedures.

The implementation follows the official [jsPsych 8 documentation](https://www.jspsych.org/latest/).
