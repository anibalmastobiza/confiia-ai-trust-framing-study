import { studyResponses } from "@/db/schema";
import { getDb } from "@/db";
import { NextResponse } from "next/server";

const STUDY_ID = "confiia_ai_trust_one_sentence_frame";
const allowedConditions = new Set(["gain", "loss"]);
const allowedReliance = new Set(["clinician", "equal", "ai"]);
const allowedRecall = new Set(["gain", "loss", "unsure"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(
  input: Record<string, unknown>,
  key: string,
  maxLength = 200,
) {
  const value = input[key];
  if (typeof value !== "string" || value.length === 0 || value.length > maxLength) {
    throw new Error(`Invalid ${key}`);
  }
  return value;
}

function integerField(
  input: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
) {
  const value = input[key];
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) {
    throw new Error(`Invalid ${key}`);
  }
  return Number(value);
}

function parsePayload(input: unknown) {
  if (!isRecord(input)) throw new Error("Invalid payload");

  const studyId = stringField(input, "study_id", 80);
  if (studyId !== STUDY_ID) throw new Error("Unknown study");

  const id = stringField(input, "submission_id", 40);
  const participantId = stringField(input, "participant_id", 24);
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid submission_id");
  if (!/^CONFIIA-[A-F0-9]{8}$/.test(participantId)) {
    throw new Error("Invalid participant_id");
  }

  const frameCondition = stringField(input, "frame_condition", 10);
  const relianceChoice = stringField(input, "reliance_choice", 20);
  const recalledFrame = stringField(input, "recalled_frame", 20);
  if (!allowedConditions.has(frameCondition)) throw new Error("Invalid frame");
  if (!allowedReliance.has(relianceChoice)) throw new Error("Invalid reliance");
  if (!allowedRecall.has(recalledFrame)) throw new Error("Invalid recall");

  const trustIndex = input.trust_index;
  if (typeof trustIndex !== "number" || trustIndex < 0 || trustIndex > 6) {
    throw new Error("Invalid trust_index");
  }

  return {
    id,
    participantId,
    studyId,
    studyVersion: stringField(input, "study_version", 20),
    jspsychVersion: stringField(input, "jspsych_version", 20),
    sessionStartedUtc: stringField(input, "session_started_utc", 40),
    sessionCompletedUtc: stringField(input, "session_completed_utc", 40),
    frameCondition,
    primaryTrust: integerField(input, "primary_trust", 0, 6),
    comfortWithUse: integerField(input, "comfort_with_use", 0, 6),
    perceivedReliability: integerField(input, "perceived_reliability", 0, 6),
    trustIndex,
    relianceChoice,
    relianceOrder: stringField(input, "reliance_order", 40),
    recalledFrame,
    recallCorrect: input.recall_correct === true,
    recallOrder: stringField(input, "recall_order", 40),
    stakeholderRole: stringField(input, "stakeholder_role", 80),
    healthAiFamiliarity: stringField(input, "health_ai_familiarity", 80),
    consentRtMs: integerField(input, "consent_rt_ms", 0, 600_000),
    frameRtMs: integerField(input, "frame_rt_ms", 0, 600_000),
    trustRtMs: integerField(input, "trust_rt_ms", 0, 600_000),
    relianceRtMs: integerField(input, "reliance_rt_ms", 0, 600_000),
    recallRtMs: integerField(input, "recall_rt_ms", 0, 600_000),
    backgroundRtMs: integerField(input, "background_rt_ms", 0, 600_000),
    totalElapsedMs: integerField(input, "total_elapsed_ms", 0, 1_800_000),
  };
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 16_384) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const values = parsePayload(await request.json());
    await getDb().insert(studyResponses).values(values);
    return NextResponse.json({ stored: true }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid response";
    const isValidationError = message.startsWith("Invalid") || message === "Unknown study";
    console.error("Response storage error", message);
    return NextResponse.json(
      { error: isValidationError ? "Invalid response" : "Storage unavailable" },
      { status: isValidationError ? 400 : 500 },
    );
  }
}
