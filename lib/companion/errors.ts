/** An expected failure with the status the API should answer with. */
export class CompanionError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}
