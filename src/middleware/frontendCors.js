const defaultFrontendOrigin = "http://localhost:3000";

export function frontendCors(req, res, next) {
    const origin = req.get("origin");
    const allowedOrigin = process.env.FRONTEND_ORIGIN || defaultFrontendOrigin;

    if (origin && origin !== allowedOrigin) {
        res.status(403).json({ error: "El origen del frontend no está permitido." });
        return;
    }

    if (origin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
        res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    }

    if (req.method === "OPTIONS") {
        res.sendStatus(204);
        return;
    }

    next();
}
