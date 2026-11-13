import express from "express";
import { createAdminRouter } from "./routes/admin.js";
import { createCurrentUserRouter } from "./routes/currentUser.js";
import { createCandidateRouter } from "./routes/candidate.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { frontendCors } from "./middleware/frontendCors.js";
import { createGeneralRouter } from "./routes/general.js";
import { createCursosForosRouter } from "./routes/cursosForos.js";
import { createEmpleoRouter } from "./routes/empleo.js";

export function createApp({
    adminRouter = createAdminRouter(),
    currentUserRouter = createCurrentUserRouter(),
    candidateRouter = createCandidateRouter(),
} = {}) {
    const app = express();
    app.use(express.json({ limit: "32kb" }));
    app.disable("x-powered-by");
    app.use(frontendCors);

    app.use("/api/v1/admin", adminRouter);
    app.use("/api/v1/me", currentUserRouter);
    app.use("/api/v1/candidate", candidateRouter);
    app.use("/api/v1/general", createGeneralRouter());
    app.use("/api/v1/cursos-foros", createCursosForosRouter());
    app.use("/api/v1/empleo", createEmpleoRouter());
    app.use(errorHandler);

    return app;
}
