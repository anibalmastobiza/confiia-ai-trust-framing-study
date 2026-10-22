const PROLIFIC_STUDY_ID = "6ad9d45f58c16fdff07d80eb";
const PROLIFIC_COMPLETION_CODE = "C16ZE7NM";

export function getProlificCompletion(recruitment: {
  prolific_pid: string;
  prolific_study_id: string;
}) {
  if (
    !recruitment.prolific_pid ||
    recruitment.prolific_study_id !== PROLIFIC_STUDY_ID
  ) {
    return null;
  }

  return {
    code: PROLIFIC_COMPLETION_CODE,
    url: `https://app.prolific.com/submissions/complete?cc=${PROLIFIC_COMPLETION_CODE}`,
  };
}
