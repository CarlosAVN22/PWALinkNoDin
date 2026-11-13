import { query, validationResult } from "express-validator";

export const runValidations = (validations) => async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }

    const error = new Error("Los parámetros enviados no son válidos");
    error.statusCode = 400;
    error.details = errors.array();
    next(error);
};

export const listUsersValidation = [
    query("role")
        .optional()
        .isIn(["candidate", "company", "admin"])
        .withMessage("El rol debe ser candidate, company o admin")
];
