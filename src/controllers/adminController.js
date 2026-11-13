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
import {
    deleteAdminUser,
    inviteAdminUser,
    listAdminUsers,
    sendAdminUserPasswordReset,
    updateAdminUser,
} from "../services/adminUsersService.js";
import {
    getAdminSecurityData,
    reviewAdminSecurityAlert,
    updateAdminSecurityPreferences,
} from "../services/adminSecurityService.js";
import { recordAdminAction } from "../services/adminAuditService.js";

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
        await recordAdminAction(req.adminContext, {
            eventType: "account",
            action: "Verificación de empresa actualizada",
            affectedRecord: data.commercial_name,
            details: `Estado: ${req.validatedStatus}.`,
        });
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
        await recordAdminAction(req.adminContext, {
            eventType: "content",
            action: "Categoría creada",
            affectedRecord: data.name,
            details: `Tipo: ${req.params.type}.`,
        });
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
        await recordAdminAction(req.adminContext, {
            eventType: "content",
            action: "Categoría actualizada",
            affectedRecord: String(req.validatedId),
            details: `Tipo: ${req.params.type}.`,
        });
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
        await recordAdminAction(req.adminContext, {
            eventType: "content",
            action: "Categoría desactivada",
            affectedRecord: String(req.validatedId),
            details: `Tipo: ${req.params.type}.`,
        });
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
        await recordAdminAction(req.adminContext, {
            eventType: "content",
            action: "Estado de curso actualizado",
            affectedRecord: data.title,
            details: `Estado: ${req.validatedStatus}.`,
        });
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
        await recordAdminAction(req.adminContext, {
            eventType: "content",
            action: "Estado de tema actualizado",
            affectedRecord: data.title,
            details: `Estado: ${req.validatedStatus}.`,
        });
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
        await recordAdminAction(req.adminContext, {
            eventType: "content",
            action: "Decisión de reporte registrada",
            affectedRecord: String(req.validatedId),
            details: `Decisión: ${req.validatedDecision}.`,
        });
        sendResult(req, res, data);
    } catch (error) {
        next(error);
    }
}

export async function getUsers(req, res, next) {
    try {
        sendResult(req, res, await listAdminUsers(req.adminContext));
    } catch (error) {
        next(error);
    }
}

export async function createUser(req, res, next) {
    try {
        sendResult(req, res, await inviteAdminUser(req.adminContext, req.validatedUser), 201);
    } catch (error) {
        next(error);
    }
}

export async function updateUser(req, res, next) {
    try {
        sendResult(
            req,
            res,
            await updateAdminUser(req.adminContext, req.validatedId, req.validatedChanges),
        );
    } catch (error) {
        next(error);
    }
}

export async function resetUserPassword(req, res, next) {
    try {
        sendResult(req, res, await sendAdminUserPasswordReset(req.adminContext, req.validatedId));
    } catch (error) {
        next(error);
    }
}

export async function removeUser(req, res, next) {
    try {
        sendResult(req, res, await deleteAdminUser(req.adminContext, req.validatedId));
    } catch (error) {
        next(error);
    }
}

export async function getSecurity(req, res, next) {
    try {
        sendResult(req, res, await getAdminSecurityData(req.adminContext));
    } catch (error) {
        next(error);
    }
}

export async function updateSecurityPreferences(req, res, next) {
    try {
        sendResult(
            req,
            res,
            await updateAdminSecurityPreferences(req.adminContext, req.validatedChanges),
        );
    } catch (error) {
        next(error);
    }
}

export async function reviewSecurityAlert(req, res, next) {
    try {
        sendResult(req, res, await reviewAdminSecurityAlert(req.adminContext, req.validatedId));
    } catch (error) {
        next(error);
    }
}
