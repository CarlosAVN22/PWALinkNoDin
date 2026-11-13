import {
    createAdminCategory,
    decideAdminReport,
    deactivateAdminCategory,
    listAdminCategories,
    listAdminCourses,
    listAdminReports,
    listAdminTopics,
    setAdminCourseStatus,
    setAdminTopicStatus,
    updateAdminCategory,
} from "../services/adminContentService.js";
import { getAdminDashboard } from "../services/adminDashboardService.js";
import {
    listAdminCompanies,
    updateCompanyVerification,
} from "../services/adminCompaniesService.js";

function sendResult(req, res, data, statusCode = 200) {
    res.status(statusCode).json({
        data,
        meta: { dataSource: req.adminContext.dataSource },
    });
}

export async function getDashboard(req, res, next) {
    try {
        const data = await getAdminDashboard(req.adminContext);
        sendResult(req, res, data);
    } catch (error) {
        next(error);
    }
}

export async function getCompanies(req, res, next) {
    try {
        const data = await listAdminCompanies(req.adminContext);
        sendResult(req, res, data);
    } catch (error) {
        next(error);
    }
}

export async function updateCompanyStatus(req, res, next) {
    try {
        const data = await updateCompanyVerification(
            req.adminContext,
            req.validatedId,
            req.validatedStatus,
        );
        sendResult(req, res, data);
    } catch (error) {
        next(error);
    }
}

export async function getCategories(req, res, next) {
    try {
        const data = await listAdminCategories(req.adminContext, req.params.type);
        sendResult(req, res, data);
    } catch (error) {
        next(error);
    }
}

export async function createCategory(req, res, next) {
    try {
        const data = await createAdminCategory(
            req.adminContext,
            req.params.type,
            req.validatedName,
        );
        sendResult(req, res, data, 201);
    } catch (error) {
        next(error);
    }
}

export async function updateCategory(req, res, next) {
    try {
        const data = await updateAdminCategory(
            req.adminContext,
            req.params.type,
            req.validatedId,
            req.validatedChanges,
        );
        sendResult(req, res, data);
    } catch (error) {
        next(error);
    }
}

export async function deactivateCategory(req, res, next) {
    try {
        const data = await deactivateAdminCategory(
            req.adminContext,
            req.params.type,
            req.validatedId,
        );
        sendResult(req, res, data);
    } catch (error) {
        next(error);
    }
}

export async function getCourses(req, res, next) {
    try {
        const data = await listAdminCourses(req.adminContext);
        sendResult(req, res, data);
    } catch (error) {
        next(error);
    }
}

export async function updateCourseStatus(req, res, next) {
    try {
        const data = await setAdminCourseStatus(
            req.adminContext,
            req.validatedId,
            req.validatedStatus,
        );
        sendResult(req, res, data);
    } catch (error) {
        next(error);
    }
}

export async function getTopics(req, res, next) {
    try {
        const data = await listAdminTopics(req.adminContext);
        sendResult(req, res, data);
    } catch (error) {
        next(error);
    }
}

export async function updateTopicStatus(req, res, next) {
    try {
        const data = await setAdminTopicStatus(
            req.adminContext,
            req.validatedId,
            req.validatedStatus,
        );
        sendResult(req, res, data);
    } catch (error) {
        next(error);
    }
}

export async function getReports(req, res, next) {
    try {
        const data = await listAdminReports(req.adminContext, req.validatedFilter);
        sendResult(req, res, data);
    } catch (error) {
        next(error);
    }
}

export async function updateReportDecision(req, res, next) {
    try {
        const data = await decideAdminReport(
            req.adminContext,
            req.validatedId,
            req.validatedDecision,
        );
        sendResult(req, res, data);
    } catch (error) {
        next(error);
    }
}
