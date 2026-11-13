import { Router } from "express";
import { createUserAuth } from "../middleware/userAuth.js";
import {
    getGuideActivities,
    getGuideProgress,
    changeGuideProgress,
    getNotifications,
    readNotification,
    getNotificationPreferences,
    saveNotificationPreference,
    getReviewCompanies,
    getReviews,
    createReview,
    deleteReview,
    getResources,
    getResourceSections,
    getResourceChecklist,
    getResourceActivity,
    saveResourceActivity,
    getAccount,
    getHome,
} from "../controllers/generalController.js";

export function createGeneralRouter() {
    const router = Router();
    const requireUser = createUserAuth();

    router.get("/guide", getGuideActivities);
    router.get("/guide/progress", requireUser, getGuideProgress);
    router.put("/guide/progress/:activityId", requireUser, changeGuideProgress);
    router.get("/notifications", requireUser, getNotifications);
    router.patch("/notifications/:notificationId/read", requireUser, readNotification);
    router.get("/notification-preferences", requireUser, getNotificationPreferences);
    router.put("/notification-preferences/:type", requireUser, saveNotificationPreference);
    router.get("/review-companies", getReviewCompanies);
    router.get("/reviews", getReviews);
    router.post("/reviews", requireUser, createReview);
    router.delete("/reviews/:reviewId", requireUser, deleteReview);
    router.get("/resources", getResources);
    router.get("/resources/:resourceId/sections", getResourceSections);
    router.get("/resources/:resourceId/checklist", getResourceChecklist);
    router.get("/resource-activity", requireUser, getResourceActivity);
    router.put("/resource-activity/:resourceId", requireUser, saveResourceActivity);
    router.get("/account", requireUser, getAccount);
    router.get("/home", getHome);

    return router;
}
