import { UserInputError } from 'apollo-server-express';
import { ValidationResult } from 'joi';
import { Request } from 'express';
import {
  userEmailSchema,
  userInputBaseSchema,
  userInputExtendedSchema,
  userPasswordSchema
} from './joi/validationSchemas/userRequestSchemas';
import { postInputSchema } from './joi/validationSchemas/postRequestSchemas';

interface RequestValidator {
  validateRequest(req: Request): void;
}

class Validator implements RequestValidator {
  validateRequest(req: Request): void {
    let result: ValidationResult;
    let request;

    switch (req.body.operationName) {
      case 'Login':
        request = {
          email: req.body?.variables?.options?.email,
          password: req.body?.variables?.options?.password
        };
        result = userInputBaseSchema.validate(request, { abortEarly: false });
        break;
      case 'Register':
        request = {
          username: req.body?.variables?.options?.username,
          email: req.body?.variables?.options?.email,
          password: req.body?.variables?.options?.password
        };
        result = userInputExtendedSchema.validate(request, {
          abortEarly: false
        });
        break;
      case 'ForgotPassword':
        request = {
          email: req.body?.variables?.email
        };
        result = userEmailSchema.validate(request);
        break;
      case 'ChangePassword':
        request = {
          password: req.body?.variables?.password
        };
        result = userPasswordSchema.validate(request);
        break;
      case 'CreatePost':
        request = {
          title: req.body?.variables?.input?.title,
          content: req.body?.variables?.input?.content
        };
        result = postInputSchema.validate(request, { abortEarly: false });
        break;
      default:
        return;
    }

    if (result.error) {
      throw new UserInputError(`Input error: ${result.error.message}`);
    }
  }
}

export const validator = new Validator();
