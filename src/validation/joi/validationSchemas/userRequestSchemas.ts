import Joi from 'joi';

export const userEmailSchema = Joi.object({
  email: Joi.string().email().lowercase().required()
});

export const userPasswordSchema = Joi.object({
  password: Joi.string().min(2).required()
});

export const userInputBaseSchema = userEmailSchema.concat(userPasswordSchema);

export const userInputExtendedSchema = userInputBaseSchema.append({
  username: Joi.string().alphanum().min(2).max(30).required()
});
