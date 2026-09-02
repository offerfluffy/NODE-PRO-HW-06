export class NotFoundError extends Error {
  statusCode = 404;

  constructor(message = "Resource not found") {
    super(message);
  }
}

type ValidationFieldError = {
  field: string;
  message: string;
};

export class ValidationError extends Error {
  constructor(public fields: ValidationFieldError[]) {
    super("Validation failed");
  }
}
