import { QueryContext } from '../types';
import { validator } from '../validation/validator';
import { MiddlewareFn } from 'type-graphql';

export const validateInput: MiddlewareFn<QueryContext> = async (
  { context },
  next
) => {
  try {
    validator.validateRequest(context.req);
    return next();
  } catch (err) {
    throw Error(err);
  }
};
