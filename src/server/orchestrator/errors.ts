export type OrchestratorErrorCode =
  | "NOT_FOUND"
  | "WORKFLOW_ALREADY_INITIALIZED"
  | "INVALID_TASK_STATUS"
  | "INVALID_STATE_TRANSITION"
  | "PREREQUISITES_NOT_MET"
  | "VALIDATION_ERROR"
  | "BRAND_BIBLE_INCOMPLETE";

export class OrchestratorError extends Error {
  readonly code: OrchestratorErrorCode;
  readonly httpStatus: number;

  constructor(
    code: OrchestratorErrorCode,
    message: string,
    httpStatus = 400,
  ) {
    super(message);
    this.name = "OrchestratorError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}
