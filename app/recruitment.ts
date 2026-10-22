export function readRecruitmentMetadata(search: string) {
  const params = new URLSearchParams(search);
  const assignedStudy = params.get("assigned_study") ?? "";
  const prolificPid = (params.get("PROLIFIC_PID") ?? "").slice(0, 128);

  return {
    recruitment_id: (params.get("rid") ?? "").slice(0, 128),
    recruitment_source:
      (params.get("source") ?? "").slice(0, 80) ||
      (prolificPid ? "prolific" : ""),
    assigned_study:
      assignedStudy === "study01" || assignedStudy === "study02"
        ? assignedStudy
        : "",
    prolific_pid: prolificPid,
    prolific_study_id: (params.get("STUDY_ID") ?? "").slice(0, 128),
    prolific_session_id: (params.get("SESSION_ID") ?? "").slice(0, 128),
  };
}
