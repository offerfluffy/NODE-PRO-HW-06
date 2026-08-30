import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

type Ctor<T extends object = object> = new (...args: any[]) => T;

export type ValidationErrorDetail = {
  field: string;
  constraints: Record<string, string>;
};

export class ValidationException extends Error {
  constructor(public details: ValidationErrorDetail[]) {
    super("Validation failed");
  }
}

export class ValidationPipe {
  async transform(value: unknown, metatype?: Ctor): Promise<unknown> {
    const primitiveTypes: unknown[] = [String, Number, Boolean, Array, Object];

    if (metatype === undefined || primitiveTypes.includes(metatype)) {
      return value;
    }

    const instance = plainToInstance(metatype, value ?? {});
    const errors = await validate(instance);

    if (errors.length > 0) {
      throw new ValidationException(
        errors.map((error) => ({
          field: error.property,
          constraints: error.constraints ?? {},
        })),
      );
    }

    return instance;
  }
}
