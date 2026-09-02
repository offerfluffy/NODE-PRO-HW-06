import { ZodType } from "zod";
import { ValidationError } from "../errors";

interface PipeTransform {
  transform(value: unknown): unknown | Promise<unknown>;
}

export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodType) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new ValidationError(
        result.error.issues.map((feild) => ({
          field: feild.path.join("."),
          message: feild.message,
        })),
      );
    }

    return result.data;
  }
}
