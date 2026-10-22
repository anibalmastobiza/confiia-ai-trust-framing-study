"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readRecruitmentMetadata } from "./recruitment";
import { getProlificCompletion } from "./prolific";

type StudyStage = "landing" | "running" | "saving" | "complete" | "error";
type FrameCondition = "gain" | "loss";
type SubmissionStatus = "sent" | "failed";

type TrialRecord = {
  phase?: string;
  response?: Record<string, string | number> | number;
  frame_text?: string;
  trust_index?: number;
  reliance_choice?: string;
  reliance_order?: string;
  recalled_frame?: string;
  recall_correct?: boolean;
  recall_order?: string;
  rt?: number;
};

type CompletionData = {
  participantId: string;
  csv: string;
  json: string;
  submissionStatus: SubmissionStatus;
  prolificCompletion: ReturnType<typeof getProlificCompletion>;
};

const STUDY_ID = "confiia_ai_trust_one_sentence_frame";
const STUDY_VERSION = "1.2.4";
const DATA_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbxv_noKnwGC4LCkoex3yYkSDfa3fCk7ZTUjwpcs1ukTCGfOaMCRpJHgxxv-y70hdg2_/exec";

const FRAME_TEXT: Record<FrameCondition, string> = {
  gain:
    "An AI-assisted diagnostic system correctly identifies 90 out of every 100 cases reviewed by clinicians.",
  loss:
    "An AI-assisted diagnostic system fails to identify 10 out of every 100 cases reviewed by clinicians.",
};

const AGREEMENT_SCALE = [
  "Strongly disagree",
  "Disagree",
  "Somewhat disagree",
  "Neither agree nor disagree",
  "Somewhat agree",
  "Agree",
  "Strongly agree",
];

function makeParticipantId() {
  const randomPart = crypto.randomUUID().replaceAll("-", "").slice(0, 8);
  return `CONFIIA-${randomPart.toUpperCase()}`;
}

function responseValue(
  trial: TrialRecord | undefined,
  key: string,
): string | number {
  if (!trial || typeof trial.response !== "object") return "";
  return trial.response[key] ?? "";
}

async function submitStudyData(payload: Record<string, unknown>) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await fetch(DATA_ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        keepalive: true,
      });
      return;
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        await new Promise((resolve) => window.setTimeout(resolve, 750));
      }
    }
  }

  throw lastError;
}

function downloadFile(contents: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [stage, setStage] = useState<StudyStage>("landing");
  const [completion, setCompletion] = useState<CompletionData | null>(null);
  const experimentElement = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const runStudy = useCallback(async () => {
    if (!experimentElement.current || started.current) return;
    started.current = true;

    try {
      const [jsPsychModule, buttonModule, likertModule, multiChoiceModule] =
        await Promise.all([
          import("jspsych"),
          import("@jspsych/plugin-html-button-response"),
          import("@jspsych/plugin-survey-likert"),
          import("@jspsych/plugin-survey-multi-choice"),
        ]);

      const { initJsPsych } = jsPsychModule;
      const htmlButtonResponse = buttonModule.default;
      const surveyLikert = likertModule.default;
      const surveyMultiChoice = multiChoiceModule.default;
      const participantId = makeParticipantId();
      const submissionId = crypto.randomUUID();
      const recruitment = readRecruitmentMetadata(window.location.search);
      const prolificCompletion = getProlificCompletion(recruitment);
      const sessionStartedUtc = new Date().toISOString();
      const sessionStartedMs = Date.now();

      const jsPsych = initJsPsych({
        display_element: experimentElement.current,
        show_progress_bar: true,
        auto_update_progress_bar: true,
        message_progress_bar: "Study progress",
        on_finish: () => {
          setStage("saving");
          const data = jsPsych.data.get();
          const trials = data.values() as TrialRecord[];
          const trial = (phase: string) =>
            trials.find((record) => record.phase === phase);
          const frameTrial = trial("frame_exposure");
          const trustTrial = trial("trust_outcomes");
          const relianceTrial = trial("reliance_choice");
          const recallTrial = trial("frame_recall");
          const backgroundTrial = trial("background");

          const payload = {
            study_id: STUDY_ID,
            study_version: STUDY_VERSION,
            submission_id: submissionId,
            participant_id: participantId,
            jspsych_version: jsPsych.version(),
            session_started_utc: sessionStartedUtc,
            session_completed_utc: new Date().toISOString(),
            frame_condition: condition,
            primary_trust: responseValue(trustTrial, "primary_trust"),
            comfort_with_use: responseValue(trustTrial, "comfort_with_use"),
            perceived_reliability: responseValue(
              trustTrial,
              "perceived_reliability",
            ),
            trust_index: trustTrial?.trust_index ?? "",
            reliance_choice: relianceTrial?.reliance_choice ?? "",
            reliance_order: relianceTrial?.reliance_order ?? "",
            recalled_frame: recallTrial?.recalled_frame ?? "",
            recall_correct: recallTrial?.recall_correct ?? false,
            recall_order: recallTrial?.recall_order ?? "",
            stakeholder_role: responseValue(
              backgroundTrial,
              "stakeholder_role",
            ),
            health_ai_familiarity: responseValue(
              backgroundTrial,
              "health_ai_familiarity",
            ),
            sex_assigned_at_birth: responseValue(
              backgroundTrial,
              "sex_assigned_at_birth",
            ),
            consent_rt_ms: trial("consent")?.rt ?? "",
            frame_rt_ms: frameTrial?.rt ?? "",
            trust_rt_ms: trustTrial?.rt ?? "",
            reliance_rt_ms: relianceTrial?.rt ?? "",
            recall_rt_ms: recallTrial?.rt ?? "",
            background_rt_ms: backgroundTrial?.rt ?? "",
            total_elapsed_ms: Date.now() - sessionStartedMs,
            ...recruitment,
          };

          void (async () => {
            let submissionStatus: SubmissionStatus = "sent";
            try {
              await submitStudyData(payload);
            } catch (submissionError) {
              console.error("Study response could not be stored", submissionError);
              submissionStatus = "failed";
            }

            setCompletion({
              participantId,
              csv: data.csv(),
              json: data.json(),
              submissionStatus,
              prolificCompletion,
            });
            setStage("complete");
          })();
        },
      });

      const condition = jsPsych.randomization.sampleWithoutReplacement(
        ["gain", "loss"] as FrameCondition[],
        1,
      )[0];
      const frameSentence = FRAME_TEXT[condition];
      const jsPsychVersion = jsPsych.version();

      jsPsych.data.addProperties({
        participant_id: participantId,
        study_id: STUDY_ID,
        study_version: STUDY_VERSION,
        jspsych_version: jsPsychVersion,
        frame_condition: condition,
        session_started_utc: sessionStartedUtc,
        ...recruitment,
      });

      const relianceOptions = jsPsych.randomization.shuffle([
        {
          label: "Give more weight to the clinician’s judgment",
          value: "clinician",
        },
        {
          label: "Give both assessments equal weight",
          value: "equal",
        },
        {
          label: "Give more weight to the AI recommendation",
          value: "ai",
        },
      ]);

      const recallOptions = jsPsych.randomization.shuffle([
        {
          label: "It correctly identifies 90 out of every 100 cases",
          value: "gain",
        },
        {
          label: "It fails to identify 10 out of every 100 cases",
          value: "loss",
        },
        { label: "I do not remember", value: "unsure" },
      ]);

      const timeline = [
        {
          type: htmlButtonResponse,
          stimulus: `
            <section class="trial-card consent-card">
              <p class="trial-kicker">Before you begin</p>
              <h1>A brief study of AI in clinical decisions</h1>
              <p>You are invited to take part in a minimal-risk research pilot about impressions of a hypothetical AI-assisted diagnostic system. The system and its performance figures are fictional research examples.</p>
              <div class="consent-grid">
                <div><span>Time</span><strong>About 2 minutes</strong></div>
                <div><span>Task</span><strong>Read one sentence and respond</strong></div>
                <div><span>Privacy</span><strong>No names or contact details</strong></div>
              </div>
              <p class="fine-print">Participation is voluntary. You may stop at any time by closing this page. Your responses and response times will be stored for research.${recruitment.prolific_pid || recruitment.prolific_study_id || recruitment.prolific_session_id ? " If you enter through Prolific, the participant, study and session identifiers supplied by Prolific are stored with your responses to link your participation." : ""} This prototype is not a clinical tool. Questions may be directed to <a href="mailto:amastobiza@ugr.es">amastobiza@ugr.es</a>.</p>
            </section>`,
          choices: ["I am 18 or older and I agree"],
          data: { phase: "consent" },
        },
        {
          type: htmlButtonResponse,
          stimulus: `
            <section class="trial-card frame-card">
              <p class="trial-kicker">Read carefully</p>
              <blockquote>${frameSentence}</blockquote>
              <p class="reading-note">Form an impression of the system. The button will activate after a brief reading period.</p>
            </section>`,
          choices: ["Continue"],
          enable_button_after: 2500,
          data: {
            phase: "frame_exposure",
            frame_text: frameSentence,
          },
        },
        {
          type: surveyLikert,
          preamble: `
            <div class="survey-heading">
              <p class="trial-kicker">Your judgment · 1 of 4</p>
              <h2>What is your impression of the system?</h2>
              <p>Indicate how much you agree with each statement.</p>
            </div>`,
          questions: [
            {
              prompt:
                "I would trust this AI-assisted diagnostic system to support a clinician’s decision.",
              name: "primary_trust",
              labels: AGREEMENT_SCALE,
              required: true,
            },
            {
              prompt:
                "I would feel comfortable with a clinician using this system in my care.",
              name: "comfort_with_use",
              labels: AGREEMENT_SCALE,
              required: true,
            },
            {
              prompt: "This AI-assisted diagnostic system seems reliable.",
              name: "perceived_reliability",
              labels: AGREEMENT_SCALE,
              required: true,
            },
          ],
          button_label: "Continue",
          data: { phase: "trust_outcomes" },
          on_finish: (data: {
            response: Record<string, number>;
            trust_index?: number;
          }) => {
            const values = [
              Number(data.response.primary_trust),
              Number(data.response.comfort_with_use),
              Number(data.response.perceived_reliability),
            ];
            data.trust_index =
              Math.round(
                (values.reduce((sum, value) => sum + value, 0) /
                  values.length) *
                  100,
              ) / 100;
          },
        },
        {
          type: htmlButtonResponse,
          stimulus: `
            <section class="trial-card choice-card">
              <p class="trial-kicker">Your judgment · 2 of 4</p>
              <h2>If the clinician and the system disagreed, what should happen?</h2>
              <p>Choose the response that comes closest to your view.</p>
            </section>`,
          choices: relianceOptions.map((option) => option.label),
          grid_columns: 1,
          data: { phase: "reliance_choice" },
          on_finish: (data: {
            response: number;
            reliance_choice?: string;
            reliance_order?: string;
          }) => {
            data.reliance_choice = relianceOptions[data.response].value;
            data.reliance_order = relianceOptions
              .map((option) => option.value)
              .join("|");
          },
        },
        {
          type: htmlButtonResponse,
          stimulus: `
            <section class="trial-card recall-card">
              <p class="trial-kicker">Your judgment · 3 of 4</p>
              <h2>Which description did you read?</h2>
              <p>Please answer from memory.</p>
            </section>`,
          choices: recallOptions.map((option) => option.label),
          grid_columns: 1,
          data: { phase: "frame_recall" },
          on_finish: (data: {
            response: number;
            recalled_frame?: string;
            recall_correct?: boolean;
            recall_order?: string;
          }) => {
            const selected = recallOptions[data.response];
            data.recalled_frame = selected.value;
            data.recall_correct = selected.value === condition;
            data.recall_order = recallOptions
              .map((option) => option.value)
              .join("|");
          },
        },
        {
          type: surveyMultiChoice,
          preamble: `
            <div class="survey-heading">
              <p class="trial-kicker">Your judgment · 4 of 4</p>
              <h2>Three brief background questions</h2>
              <p>These help us compare perspectives across the CONFIIA community.</p>
            </div>`,
          questions: [
            {
              prompt: "Which perspective best describes you?",
              name: "stakeholder_role",
              options: [
                "Healthcare professional or student",
                "Patient or member of the public",
                "AI researcher, developer, or student",
                "Another perspective",
                "Prefer not to answer",
              ],
              required: true,
            },
            {
              prompt:
                "How familiar are you with AI applications in healthcare?",
              name: "health_ai_familiarity",
              options: [
                "Not at all familiar",
                "Slightly familiar",
                "Moderately familiar",
                "Very familiar",
                "Extremely familiar",
                "Prefer not to answer",
              ],
              required: true,
            },
            {
              prompt:
                "What sex were you assigned at birth, on your original birth certificate?",
              name: "sex_assigned_at_birth",
              options: [
                "Female",
                "Male",
                "Another sex or intersex",
                "Prefer not to answer",
              ],
              required: true,
            },
          ],
          button_label: "Finish",
          data: { phase: "background" },
        },
      ];

      jsPsych.run(timeline);
    } catch (studyError) {
      console.error("The study could not start", studyError);
      started.current = false;
      setStage("error");
    }
  }, []);

  useEffect(() => {
    // jsPsych needs the experiment mount to exist before it is initialized.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stage === "running") void runStudy();
  }, [runStudy, stage]);

  if (stage === "running") {
    return (
      <main className="study-shell running-shell">
        <header className="study-header compact-header">
          <a
            className="wordmark"
            href="https://anibalmastobiza.github.io/CONFIIA/"
            target="_blank"
            rel="noreferrer"
          >
            <span className="mark" aria-hidden="true">C</span>
            CONFIIA / Study 01
          </a>
          <span className="session-label">Research session</span>
        </header>
        <div ref={experimentElement} className="experiment-mount" />
      </main>
    );
  }

  if (stage === "saving") {
    return (
      <main className="study-shell centered-shell" aria-live="polite">
        <section className="saving-card">
          <div className="pulse-mark" aria-hidden="true" />
          <p className="trial-kicker">One moment</p>
          <h1>Saving your response…</h1>
          <p>Please keep this page open. This can take up to 15 seconds.</p>
        </section>
      </main>
    );
  }

  if (stage === "complete" && completion) {
    return (
      <main className="study-shell completion-shell">
        <header className="study-header compact-header">
          <a
            className="wordmark"
            href="https://anibalmastobiza.github.io/CONFIIA/"
            target="_blank"
            rel="noreferrer"
          >
            <span className="mark" aria-hidden="true">C</span>
            CONFIIA / Study 01
          </a>
          <span className="session-label">Complete</span>
        </header>
        <section className="completion-grid">
          <div className="completion-card">
            <p className="eyebrow">Thank you</p>
            <h1>Your response is complete.</h1>
            <p className="completion-lead">
              The diagnostic system and performance figures were fictional research
              examples. The two descriptions were mathematically equivalent: identifying
              90 of 100 cases correctly means failing to identify 10 of 100.
              The study tests whether that one-sentence frame changes trust in
              AI-assisted clinical decisions.
            </p>
            <div className="participant-code">
              <span>Your session code</span>
              <strong>{completion.participantId}</strong>
            </div>
            {completion.submissionStatus === "failed" ? (
              <p className="submission-warning" role="alert">
                We could not confirm that your response was sent. Please
                download a local copy below.
              </p>
            ) : (
              <p className="submission-success">
                Your response was sent. You can keep a local copy below.
              </p>
            )}
            <div className="download-actions">
              <button
                className="secondary-button"
                onClick={() =>
                  downloadFile(
                    completion.csv,
                    `${completion.participantId}.csv`,
                    "text/csv;charset=utf-8",
                  )
                }
              >
                Download CSV
              </button>
              <button
                className="secondary-button"
                onClick={() =>
                  downloadFile(
                    completion.json,
                    `${completion.participantId}.json`,
                    "application/json",
                  )
                }
              >
                Download JSON
              </button>
            </div>
          </div>
          <aside className="debrief-card">
            <p className="overview-label">Why this matters</p>
            <p>
              CONFIIA studies the non-technical barriers that shape the
              adoption of medical AI, especially trust between patients,
              healthcare professionals, developers, and AI systems.
            </p>
            <a
              href="https://anibalmastobiza.github.io/CONFIIA/"
              target="_blank"
              rel="noreferrer"
            >
              Learn about CONFIIA <span aria-hidden="true">↗</span>
            </a>
          </aside>
          {completion.prolificCompletion && (
            <div className="completion-card prolific-completion">
              <p className="eyebrow">Prolific completion</p>
              <p>
                Return to Prolific to record your participation. If needed,
                you can enter the completion code below manually.
              </p>
              <div className="participant-code">
                <span>Prolific completion code</span>
                <strong>{completion.prolificCompletion.code}</strong>
              </div>
              <a
                className="primary-button prolific-return"
                href={completion.prolificCompletion.url}
              >
                Return to Prolific
              </a>
            </div>
          )}
        </section>
      </main>
    );
  }

  if (stage === "error") {
    return (
      <main className="study-shell centered-shell">
        <section className="error-card">
          <p className="eyebrow">Unable to start</p>
          <h1>The study did not load correctly.</h1>
          <p>Please check your connection and try once more.</p>
          <button className="primary-button" onClick={() => setStage("running")}>
            Try again
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="study-shell landing-shell">
      <header className="study-header">
        <a
          className="wordmark"
          href="https://anibalmastobiza.github.io/CONFIIA/"
          target="_blank"
          rel="noreferrer"
        >
          <span className="mark" aria-hidden="true">C</span>
          CONFIIA / Study 01
        </a>
        <div className="pilot-status"><span /> Research pilot</div>
      </header>

      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">AI + clinical judgment</p>
          <h1>
            Would you <em>trust</em> this system?
          </h1>
          <p className="hero-summary">
            Read one sentence about a hypothetical AI-assisted diagnostic system,
            then share your first considered impression.
          </p>
          <button
            className="primary-button begin-button"
            onClick={() => setStage("running")}
          >
            Begin study <span aria-hidden="true">→</span>
          </button>
          <p className="eligibility-note">
            For adults aged 18+ · No names requested · About 2 minutes
          </p>
        </div>

        <aside className="study-overview" aria-label="Study overview">
          <span className="overview-index" aria-hidden="true">01</span>
          <p className="overview-label">What to expect</p>
          <ol>
            <li>
              <span>01</span>
              <div><strong>Read</strong><p>One sentence about medical AI</p></div>
            </li>
            <li>
              <span>02</span>
              <div><strong>Judge</strong><p>A few brief trust questions</p></div>
            </li>
            <li>
              <span>03</span>
              <div><strong>Finish</strong><p>Immediate explanation of the study</p></div>
            </li>
          </ol>
          <div className="overview-meta">
            <div><span>Format</span><strong>Randomized study</strong></div>
            <div><span>Built with</span><strong>jsPsych 8</strong></div>
          </div>
        </aside>
      </section>

      <footer className="study-footer">
        <p>CONFIIA · Trust and New Forms of AI Integration</p>
        <a href="mailto:amastobiza@ugr.es">Research contact</a>
      </footer>
    </main>
  );
}
