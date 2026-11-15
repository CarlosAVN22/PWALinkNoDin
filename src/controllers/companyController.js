import * as services from "../services/companyService.js";
import { ensureCompanyForAuthUser } from "../services/companyOnboardingService.js";

function respond(req, res, next, action, statusCode = 200) {
    Promise.resolve().then(action)
        .then(data => res.status(statusCode).json({ data }))
        .catch(next);
}

export const getProfile = (req, res, next) =>
    respond(req, res, next, () => services.getProfile(req.companyContext));

export const onboard = (req, res, next) =>
    respond(req, res, next, () => ensureCompanyForAuthUser(req.body?.authUserId), 201);

export const updateProfile = (req, res, next) =>
    respond(req, res, next, () => services.updateProfile(req.companyContext, req.body));

export const getVacancies = (req, res, next) =>
    respond(req, res, next, () => services.getVacancies(req.companyContext));

export const publishVacancy = (req, res, next) =>
    respond(req, res, next, () => services.publishVacancy(req.companyContext, req.body), 201);

export const getVacancy = (req, res, next) =>
    respond(req, res, next, () => services.getVacancy(req.companyContext, req.params.vacancyId));

export const updateVacancy = (req, res, next) =>
    respond(req, res, next, () => services.updateVacancy(
        req.companyContext, req.params.vacancyId, req.body,
    ));

export const updateVacancyStatus = (req, res, next) =>
    respond(req, res, next, () => services.updateVacancyStatus(
        req.companyContext, req.params.vacancyId, req.body?.status,
    ));

export const getApplications = (req, res, next) =>
    respond(req, res, next, () => services.getApplications(req.companyContext));

export const getApplication = (req, res, next) =>
    respond(req, res, next, () => services.getApplication(
        req.companyContext, req.params.applicationId,
    ));

export const getApplicationAnswers = (req, res, next) =>
    respond(req, res, next, () => services.getApplicationAnswers(
        req.companyContext, req.params.applicationId,
    ));

export const getApplicationCv = (req, res, next) =>
    respond(req, res, next, () => services.getApplicationCv(
        req.companyContext, req.params.applicationId,
    ));

export const getApplicationHistory = (req, res, next) =>
    respond(req, res, next, () => services.getApplicationHistory(
        req.companyContext, req.params.applicationId,
    ));

export const getApplicationNotes = (req, res, next) =>
    respond(req, res, next, () => services.getApplicationNotes(
        req.companyContext, req.params.applicationId,
    ));

export const saveApplicationNotes = (req, res, next) =>
    respond(req, res, next, () => services.saveApplicationNotes(
        req.companyContext, req.params.applicationId, req.body,
    ));

export const getApplicationMessages = (req, res, next) =>
    respond(req, res, next, () => services.getApplicationMessages(
        req.companyContext, req.params.applicationId,
    ));

export const sendApplicationMessage = (req, res, next) =>
    respond(req, res, next, () => services.sendApplicationMessage(
        req.companyContext, req.params.applicationId, req.body,
    ), 201);

export const updateApplicationStatus = (req, res, next) =>
    respond(req, res, next, () => services.updateApplicationStatus(
        req.companyContext, req.params.applicationId, req.body?.status,
    ));
