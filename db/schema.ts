import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const studyResponses = sqliteTable(
  "study_responses",
  {
    id: text("id").primaryKey(),
    participantId: text("participant_id").notNull().unique(),
    studyId: text("study_id").notNull(),
    studyVersion: text("study_version").notNull(),
    jspsychVersion: text("jspsych_version").notNull(),
    sessionStartedUtc: text("session_started_utc").notNull(),
    sessionCompletedUtc: text("session_completed_utc").notNull(),
    frameCondition: text("frame_condition").notNull(),
    primaryTrust: integer("primary_trust").notNull(),
    comfortWithUse: integer("comfort_with_use").notNull(),
    perceivedReliability: integer("perceived_reliability").notNull(),
    trustIndex: real("trust_index").notNull(),
    relianceChoice: text("reliance_choice").notNull(),
    relianceOrder: text("reliance_order").notNull(),
    recalledFrame: text("recalled_frame").notNull(),
    recallCorrect: integer("recall_correct", { mode: "boolean" }).notNull(),
    recallOrder: text("recall_order").notNull(),
    stakeholderRole: text("stakeholder_role").notNull(),
    healthAiFamiliarity: text("health_ai_familiarity").notNull(),
    consentRtMs: integer("consent_rt_ms").notNull(),
    frameRtMs: integer("frame_rt_ms").notNull(),
    trustRtMs: integer("trust_rt_ms").notNull(),
    relianceRtMs: integer("reliance_rt_ms").notNull(),
    recallRtMs: integer("recall_rt_ms").notNull(),
    backgroundRtMs: integer("background_rt_ms").notNull(),
    totalElapsedMs: integer("total_elapsed_ms").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("study_responses_condition_idx").on(table.frameCondition),
    index("study_responses_created_at_idx").on(table.createdAt),
  ],
);
