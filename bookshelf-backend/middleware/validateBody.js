import { validate } from '../utils/validators.js';

/**
 * Build a middleware that validates req.body against a field spec.
 *
 * On failure it answers 400 with every field-level problem at once, so the
 * client can highlight all the bad inputs in one pass instead of playing
 * whack-a-mole with one error per submit.
 *
 * On success req.body is replaced with the normalised values, and only the
 * fields named in the spec survive. That is deliberate: it stops an
 * unexpected key in the request body from reaching the database, so a request
 * carrying `{"name":"x","email":"...","password":"...","role":"admin"}`
 * cannot smuggle a role through.
 */
export function validateBody(spec) {
  return (req, res, next) => {
    const { errors, values } = validate(req.body ?? {}, spec);

    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        errors,
      });
    }

    req.body = values;
    next();
  };
}

export default validateBody;
