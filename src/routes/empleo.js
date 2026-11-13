import { Router } from "express";
import { createUserAuth } from "../middleware/userAuth.js";
import * as controller from "../controllers/empleoController.js";

export function createEmpleoRouter() {
    const router = Router();
    const requireUser = createUserAuth();
    const optionalUser = (req, res, next) => {
        if (!req.get("authorization")) return next();
        return requireUser(req, res, next);
    };

    router.get("/jobs", optionalUser, controller.getJobs);
    router.get("/companies/:companyId", optionalUser, controller.getCompanyDetail);
    router.get("/saved", requireUser, controller.getSavedJobs);
    router.post("/saved/:jobId", requireUser, controller.saveJob);
    router.delete("/saved/:jobId", requireUser, controller.removeSavedJob);
    router.get("/company/jobs", requireUser, controller.getCompanyJobs);
    router.post("/company/jobs", requireUser, controller.publishJob);

    return router;
}
