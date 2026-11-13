import { Router } from "express";
import {
    createCategory,
    deactivateCategory,
    getCategories,
    getCompanies,
    getCourses,
    getDashboard,
    getReports,
    getTopics,
    updateCategory,
    updateCompanyStatus,
    updateCourseStatus,
    updateReportDecision,
    updateTopicStatus,
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

    return router;
}
