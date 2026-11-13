import { Router } from "express";
import { createUserAuth } from "../middleware/userAuth.js";
import * as controller from "../controllers/cursosForosController.js";

export function createCursosForosRouter() {
    const router = Router();
    const requireUser = createUserAuth();
    const optionalUser = (req, res, next) => {
        if (!req.get("authorization")) return next();
        return requireUser(req, res, next);
    };

    router.get("/courses", optionalUser, controller.getCourses);
    router.get("/courses/progress", requireUser, controller.getCourseProgress);
    router.get("/courses/publishing-permission", requireUser, controller.getPublishingPermission);
    router.post("/courses/:courseId/modules/:moduleId/complete", requireUser, controller.completeLesson);
    router.post("/courses", requireUser, controller.publishCourse);
    router.get("/forum/categories", optionalUser, controller.getForumCategories);
    router.get("/forum/topics", optionalUser, controller.getTopics);
    router.get("/forum/topics/:topicId", optionalUser, controller.getTopic);
    router.post("/forum/topics", requireUser, controller.createTopic);
    router.get("/forum/topics/:topicId/replies", optionalUser, controller.getReplies);
    router.get("/forum/topics/:topicId/authors", optionalUser, controller.getAuthorNames);
    router.post("/forum/topics/:topicId/replies", requireUser, controller.createReply);
    router.patch("/forum/replies/:replyId/hide", requireUser, controller.hideReply);
    router.post("/forum/reports", requireUser, controller.reportContent);

    return router;
}
