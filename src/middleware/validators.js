import { HttpError } from "./errorHandler.js";

function validate(check) {
    return (req, res, next) => {
        try {
            check(req);
            next();
        } catch (error) {
            next(error);
        }
    };
}

function readId(value, label) {
    if (!/^[1-9]\d*$/.test(value || "")) {
        throw new HttpError(400, `${label} debe ser un identificador entero positivo.`);
    }
    return Number(value);
}

function readObjectBody(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new HttpError(400, "El cuerpo de la solicitud debe ser un objeto JSON.");
    }
    return body;
}

export const validateCompanyVerification = validate(req => {
    req.validatedId = readId(req.params.companyId, "El id de empresa");
    const { status } = readObjectBody(req.body);
    if (!["pending", "verified", "rejected"].includes(status)) {
        throw new HttpError(400, "El estado debe ser pending, verified o rejected.");
    }
    req.validatedStatus = status;
});

export const validateCategoryType = validate(req => {
    if (!["forum", "course"].includes(req.params.type)) {
        throw new HttpError(400, "El tipo debe ser forum o course.");
    }
});

export const validateCategoryCreate = [
    validateCategoryType,
    validate(req => {
        const { name } = readObjectBody(req.body);
        if (typeof name !== "string" || name.trim().length < 3 || name.trim().length > 120) {
            throw new HttpError(400, "El nombre debe tener entre 3 y 120 caracteres.");
        }
        req.validatedName = name.trim();
    }),
];

export const validateCategoryUpdate = [
    validateCategoryType,
    validate(req => {
        req.validatedId = readId(req.params.categoryId, "El id de categoria");
        const body = readObjectBody(req.body);
        const changes = {};
        if (Object.hasOwn(body, "is_active")) {
            if (typeof body.is_active !== "boolean") {
                throw new HttpError(400, "is_active debe ser booleano.");
            }
            changes.is_active = body.is_active;
        }
        if (Object.hasOwn(body, "name")) {
            if (req.params.type !== "forum") {
                throw new HttpError(400, "Las categorias de curso solo permiten cambiar su estado.");
            }
            if (typeof body.name !== "string" || body.name.trim().length < 3 || body.name.trim().length > 120) {
                throw new HttpError(400, "El nombre debe tener entre 3 y 120 caracteres.");
            }
            changes.name = body.name.trim();
        }
        if (!Object.keys(changes).length) {
            throw new HttpError(400, "Indica name o is_active para actualizar.");
        }
        req.validatedChanges = changes;
    }),
];

export const validateCategoryId = [
    validateCategoryType,
    validate(req => {
        req.validatedId = readId(req.params.categoryId, "El id de categoria");
    }),
];

export const validateCourseStatus = validate(req => {
    req.validatedId = readId(req.params.courseId, "El id de curso");
    const { status } = readObjectBody(req.body);
    if (!["published", "hidden"].includes(status)) {
        throw new HttpError(400, "El estado debe ser published o hidden.");
    }
    req.validatedStatus = status;
});

export const validateTopicStatus = validate(req => {
    req.validatedId = readId(req.params.topicId, "El id del tema");
    const { status } = readObjectBody(req.body);
    if (!["visible", "blocked", "hidden"].includes(status)) {
        throw new HttpError(400, "El estado debe ser visible, blocked o hidden.");
    }
    req.validatedStatus = status;
});

export const validateReportFilter = validate(req => {
    const filter = req.query.status || "open";
    if (!["open", "closed", "all"].includes(filter)) {
        throw new HttpError(400, "status debe ser open, closed o all.");
    }
    req.validatedFilter = filter;
});

export const validateReportDecision = validate(req => {
    req.validatedId = readId(req.params.reportId, "El id del reporte");
    const { decision } = readObjectBody(req.body);
    if (!["keep", "hide"].includes(decision)) {
        throw new HttpError(400, "decision debe ser keep o hide.");
    }
    req.validatedDecision = decision;
});
