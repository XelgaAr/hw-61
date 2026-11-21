import Joi from 'joi';

const text = max => Joi.string().trim().max(max);
const schemas = {
  users: { name: text(80).min(2), email: text(254).email({ tlds: false }), age: Joi.number().strict().integer().min(0).max(120).optional() },
  articles: { title: text(160), content: text(10000) }
};

export function validateBody(resource, partial = false) {
  const schema = Joi.object(schemas[resource]).min(1).required();
  return (req, res, next) => {
    const { value, error } = schema.validate(req.body, { presence: partial ? 'optional' : 'required' });
    if (error)
      return res.status(400).send(`Ошибка валидации: ${error.details[0].message}`);
    req.body = value;
    next();
  };
}

export function validateId(req, res, next, id) {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id)))
    return res.status(400).send('ID должен быть положительным целым числом.');
  res.locals.id = Number(id);
  next();
}
