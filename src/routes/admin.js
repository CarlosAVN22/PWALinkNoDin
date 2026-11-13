import { Router } from "express";
import {
    createCategory,
    deactivateCategory,
    getCategories,
    getCompanies,
    getCourses,
    getDashboard,
    getReports,
    getSecurity,
    getTopics,
    getUsers,
    createUser,
    removeUser,
    resetUserPassword,
    reviewSecurityAlert,
    updateCategory,
    updateCompanyStatus,
    updateCourseStatus,
    updateReportDecision,
    updateSecurityPreferences,
    updateTopicStatus,
    updateUser,
} from "../controllers/adminController.js";
import { createAdminAuth } from "../middleware/adminAuth.js";
import {
    validateCategoryCreate,
    validateCategoryId,
    validateCategoryUpdate,
    validateCategoryType,
    validateCompanyVerification,
    validateCourseStatus,
    validateReportDecision,
    validateReportFilter,
    validateAdminUserCreate,
    validateAdminUserId,
    validateAdminUserUpdate,
    validateSecurityAlertId,
    validateSecurityPreferences,
    validateTopicStatus,
} from "../middleware/validators.js";

export function createAdminRouter() {
    const router = Router();
    router.use(createAdminAuth());

    router.get("/dashboard", getDashboard);
    router.get("/companies", getCompanies);
    router.patch("/companies/:companyId/verification", validateCompanyVerification, updateCompanyStatus);

    router.get("/categories/:type", validateCategoryType, getCategories);
    router.post("/categories/:type", validateCategoryCreate, createCategory);
    router.patch("/categories/:type/:categoryId", validateCategoryUpdate, updateCategory);
    router.delete("/categories/:type/:categoryId", validateCategoryId, deactivateCategory);

    router.get("/courses", getCourses);
    router.patch("/courses/:courseId/status", validateCourseStatus, updateCourseStatus);
    router.get("/forum/topics", getTopics);
    router.patch("/forum/topics/:topicId/status", validateTopicStatus, updateTopicStatus);
    router.get("/reports", validateReportFilter, getReports);
    router.patch("/reports/:reportId/decision", validateReportDecision, updateReportDecision);

    router.get("/users", getUsers);
    router.post("/users", validateAdminUserCreate, createUser);
    router.patch("/users/:userId", validateAdminUserUpdate, updateUser);
    router.post("/users/:userId/password-reset", validateAdminUserId, resetUserPassword);
    router.delete("/users/:userId", validateAdminUserId, removeUser);

    router.get("/security", getSecurity);
    router.patch("/security/preferences", validateSecurityPreferences, updateSecurityPreferences);
    router.patch("/security/alerts/:alertId/review", validateSecurityAlertId, reviewSecurityAlert);

    return router;
}
