import { Router } from "express";
import { createUserAuth } from "../middleware/userAuth.js";
import { requireCompany, requireVerifiedCompany } from "../middleware/companyAuth.js";
import * as controller from "../controllers/companyController.js";

export function createCompanyRouter() {
    const router = Router();
    router.post("/onboard", controller.onboard);
    router.use(createUserAuth(), requireCompany);

    router.get("/profile", controller.getProfile);
    router.patch("/profile", controller.updateProfile);

    router.get("/vacancies", requireVerifiedCompany, controller.getVacancies);
    router.post("/vacancies", requireVerifiedCompany, controller.publishVacancy);
    router.get("/vacancies/:vacancyId", requireVerifiedCompany, controller.getVacancy);
    router.patch("/vacancies/:vacancyId", requireVerifiedCompany, controller.updateVacancy);
    router.patch("/vacancies/:vacancyId/status", requireVerifiedCompany, controller.updateVacancyStatus);

    router.get("/applications", requireVerifiedCompany, controller.getApplications);
    router.get("/applications/:applicationId", requireVerifiedCompany, controller.getApplication);
    router.get("/applications/:applicationId/answers", requireVerifiedCompany, controller.getApplicationAnswers);
    router.get("/applications/:applicationId/cv", requireVerifiedCompany, controller.getApplicationCv);
    router.get("/applications/:applicationId/history", requireVerifiedCompany, controller.getApplicationHistory);
    router.get("/applications/:applicationId/notes", requireVerifiedCompany, controller.getApplicationNotes);
    router.put("/applications/:applicationId/notes", requireVerifiedCompany, controller.saveApplicationNotes);
    router.get("/applications/:applicationId/messages", requireVerifiedCompany, controller.getApplicationMessages);
    router.post("/applications/:applicationId/messages", requireVerifiedCompany, controller.sendApplicationMessage);
    router.patch("/applications/:applicationId/status", requireVerifiedCompany, controller.updateApplicationStatus);

    return router;
}
