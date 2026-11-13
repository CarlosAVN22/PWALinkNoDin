import express from "express";
import { createAdminRouter } from "./routes/admin.js";
import { createCurrentUserRouter } from "./routes/currentUser.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { frontendCors } from "./middleware/frontendCors.js";

export function createApp({
    adminRouter = createAdminRouter(),
    currentUserRouter = createCurrentUserRouter(),
} = {}) {
    const app = express();
    app.use(express.json({ limit: "32kb" }));
    app.disable("x-powered-by");
    app.use(frontendCors);

    app.use("/api/v1/admin", adminRouter);
    app.use("/api/v1/me", currentUserRouter);
    app.use(errorHandler);

    return app;
}
