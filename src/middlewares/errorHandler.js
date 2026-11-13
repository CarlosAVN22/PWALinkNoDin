export const notFoundHandler = (req, res, next) => {
    const error = new Error(`Ruta no encontrada: ${req.method} ${req.path}`);
    error.statusCode = 404;
    next(error);
};

export const errorHandler = (error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    const databaseConflictCodes = ["23503", "23505"];
    const statusCode = error.statusCode
        || error.status
        || (databaseConflictCodes.includes(error.code) ? 409 : 500);

    if (statusCode >= 500) {
        console.error(error);
    }

    const response = {
        status: "error",
        statusCode,
        message: statusCode >= 500 ? "Error interno del servidor" : error.message
    };

    if (error.details) {
        response.errors = error.details;
    }

    res.status(statusCode).json(response);
};
