'use strict';
const createError = require('./createError');

/**
 * validate(schema)
 *
 * Returns an Express middleware that validates req.body (and optionally req.query / req.params)
 * against a Zod schema. On failure, returns a structured 400 VALIDATION_ERROR response.
 *
 * Usage:
 *   router.post('/route', validate(myZodSchema), controller)
 *
 * @param {import('zod').ZodTypeAny} schema - Zod schema to validate against
 * @param {'body'|'query'|'params'} [source='body'] - which part of the request to validate
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      // Build field-level error map: { fieldName: ["message1", ...] }
      const fields = {};
      for (const issue of result.error.issues) {
        const field = issue.path.join('.') || '_root';
        if (!fields[field]) fields[field] = [];
        fields[field].push(issue.message);
      }

      return next(
        createError(400, 'VALIDATION_ERROR', 'Validation failed', fields)
      );
    }

    // Attach parsed (coerced/stripped) data back to request
    req[source] = result.data;
    return next();
  };
}

module.exports = validate;
