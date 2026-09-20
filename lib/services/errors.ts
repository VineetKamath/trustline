export class ServiceError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export const notFound = (what: string) => new ServiceError(404, "NOT_FOUND", `${what} not found`);
export const forbidden = (message = "You are not allowed to do that") => new ServiceError(403, "FORBIDDEN", message);
export const unauthorized = () => new ServiceError(401, "UNAUTHENTICATED", "Please sign in");
export const badRequest = (message: string) => new ServiceError(400, "BAD_REQUEST", message);
export const conflict = (message: string) => new ServiceError(409, "CONFLICT", message);
