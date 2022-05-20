import Joi from 'joi';

export const postInputSchema = Joi.object({
  title: Joi.string().min(2).required(),
  content: Joi.string().min(5).required()
});
