export class WorkspaceError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "WorkspaceError";
    this.code = code;
    this.status = status;
  }
}
