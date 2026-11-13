import * as services from "../services/cursosForosServices.js";

function respond(req, res, next, action) {
    Promise.resolve().then(action).then(data => res.json({ data })).catch(next);
}

export const getCourses = (req, res, next) =>
    respond(req, res, next, () =>
        services.getCourses(req.userContext));


export const getCourseProgress = (req, res, next) =>
    respond(req, res, next, () =>
        services.getCourseProgress(req.userContext));


export const getPublishingPermission = (req, res, next) =>
    respond(req, res, next, () =>
        services.getPublishingPermission(req.userContext));


export const completeLesson = (req, res, next) =>
    respond(req, res, next, () =>
        services.completeLesson(req.userContext, req.params.courseId, req.params.moduleId));


export const publishCourse = (req, res, next) =>
    respond(req, res, next, () =>
        services.publishCourse(req.userContext, req.body));


export const getForumCategories = (req, res, next) =>
    respond(req, res, next, () => services.getForumCategories(req.userContext));


export const getTopics = (req, res, next) =>
    respond(req, res, next, () => services.getTopics(req.userContext));


export const getTopic = (req, res, next) =>
    respond(req, res, next, () => services.getTopic(req.userContext, req.params.topicId));



export const createTopic = (req, res, next) =>
    respond(req, res, next, () => services.createTopic(req.userContext, req.body));


export const getReplies = (req, res, next) =>
    respond(req, res, next, () => services.getReplies(req.userContext, req.params.topicId));


export const getAuthorNames = (req, res, next) =>
    respond(req, res, next, () => services.getAuthorNames(req.userContext, req.params.topicId));


export const createReply = (req, res, next) =>
    respond(req, res, next, () => services.createReply(req.userContext, req.params.topicId, req.body));


export const hideReply = (req, res, next) =>
    respond(req, res, next, () => services.hideReply(req.userContext, req.params.replyId));


export const reportContent = (req, res, next) =>
    respond(req, res, next, () => services.reportContent(req.userContext, req.body));
