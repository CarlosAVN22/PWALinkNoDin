export class HttpError extends Error {
    constructor(statusCode, message, { expose = statusCode < 500 } = {}) {
        super(message);
        this.name = "HttpError";
        this.statusCode = statusCode;
        this.expose = expose;
    }
}

const serviceErrorStatuses = {
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    CONFLICT: 409,
    CONFIGURATION: 503,
};

export function errorHandler(error, req, res, next) {
    if (res.headersSent) {
        return next(error);
    }

    const statusCode = Number.isInteger(error.statusCode)
        ? error.statusCode
        : error.name === "ServiceError"
            ? serviceErrorStatuses[error.code] || 500
            : 500;
    if (statusCode >= 500) {
        console.error("Error en la API:", error);
    }

    res.status(statusCode).json({
        error: error.expose || statusCode < 500
            ? error.message
            : "No se pudo completar la solicitud.",
    });
}
