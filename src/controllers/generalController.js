import * as generalServices from "../services/generalServices.js";
import * as reviewServices from "../services/reviewServices.js";
import * as resourceServices from "../services/resourceServices.js";
import * as accountServices from "../services/accountServices.js";
import * as homeServices from "../services/homeServices.js";

async function respond(req, res, next, operation) {
    try {
        const result = await operation();
        res.json({ data: result });
    } catch (error) {
        next(error);
    }
}

export function getGuideActivities(req, res, next) {
    return respond(req, res, next, () => generalServices.getGuideActivities());
}

export function getGuideProgress(req, res, next) {
    return respond(req, res, next, () => generalServices.getGuideProgress(req.userContext));
}

export function changeGuideProgress(req, res, next) {
    return respond(req, res, next, () => generalServices.changeGuideProgress(
        req.userContext,
        req.params.activityId,
        req.body?.completed,
    ));
}

export function getNotifications(req, res, next) {
    return respond(req, res, next, () => generalServices.getNotifications(req.userContext));
}

export function readNotification(req, res, next) {
    return respond(req, res, next, () => generalServices.readNotification(
        req.userContext,
        req.params.notificationId,
    ));
}

export function getNotificationPreferences(req, res, next) {
    return respond(req, res, next, () => generalServices.getNotificationPreferences(req.userContext));
}

export function saveNotificationPreference(req, res, next) {
    return respond(req, res, next, () => generalServices.saveNotificationPreference(
        req.userContext,
        req.params.type,
        req.body,
    ));
}

export function getReviewCompanies(req, res, next) {
    return respond(req, res, next, () => reviewServices.getVerifiedCompanies());
}

export function getReviews(req, res, next) {
    return respond(req, res, next, () => reviewServices.getReviews());
}

export function createReview(req, res, next) {
    return respond(req, res, next, () => reviewServices.createReview(req.userContext, req.body));
}

export function deleteReview(req, res, next) {
    return respond(req, res, next, () => reviewServices.deleteReview(req.userContext, req.params.reviewId));
}

export function getResources(req, res, next) {
    return respond(req, res, next, () => resourceServices.getResources());
}

export function getResourceSections(req, res, next) {
    return respond(req, res, next, () => resourceServices.getResourceSections(req.params.resourceId));
}

export function getResourceChecklist(req, res, next) {
    return respond(req, res, next, () => resourceServices.getResourceChecklist(req.params.resourceId));
}

export function getResourceActivity(req, res, next) {
    return respond(req, res, next, () => resourceServices.getResourceActivity(req.userContext));
}

export function saveResourceActivity(req, res, next) {
    return respond(req, res, next, () => resourceServices.saveResourceActivity(
        req.userContext,
        req.params.resourceId,
        req.body,
    ));
}

export function getAccount(req, res, next) {
    return respond(req, res, next, () => accountServices.getAccount(req.userContext));
}

export function getHome(req, res, next) {
    return respond(req, res, next, () => homeServices.getHome());
}
