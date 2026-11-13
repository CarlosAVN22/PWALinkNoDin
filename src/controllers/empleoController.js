import * as services from "../services/empleoServices.js";

function respond(req, res, next, action) {
    Promise.resolve().then(action).then(data => res.json({ data })).catch(next);
}

export const getJobs = (req, res, next) =>
    respond(req, res, next, () => services.getJobs(req.userContext));



export const getCompanyDetail = (req, res, next) =>
    respond(req, res, next, () =>
        services.getCompanyDetail(req.userContext, req.params.companyId));


export const getSavedJobs = (req, res, next) =>
    respond(req, res, next, () => services.getSavedJobs(req.userContext));


export const saveJob = (req, res, next) =>
    respond(req, res, next, () =>
        services.saveJob(req.userContext, req.params.jobId));


export const removeSavedJob = (req, res, next) =>
    respond(req, res, next, () =>
        services.removeSavedJob(req.userContext, req.params.jobId));


export const getCompanyJobs = (req, res, next) =>
    respond(req, res, next, () => services.getCompanyJobs(req.userContext));


export const publishJob = (req, res, next) =>
    respond(req, res, next, () => services.publishJob(req.userContext, req.body));
