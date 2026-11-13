import { ServiceError } from "./serviceError.js";

const categoryTables = {
    forum: "forum_categories",
    course: "course_categories",
};

async function readRows(query) {
    const { data, error } = await query;
    if (error) throw error;
    if (!Array.isArray(data)) {
        throw new Error("Supabase devolvio una respuesta inesperada.");
    }
    return data;
}

async function updateOne(query, itemName) {
    const { data, error } = await query;
    if (error) throw error;
    if (!data) throw new ServiceError("NOT_FOUND", `No se encontro ${itemName}.`);
    return data;
}

export async function listAdminCategories(adminContext, type) {
    return readRows(
        adminContext.client
            .from(categoryTables[type])
            .select("id,name,is_active")
            .order("name"),
    );
}

export async function createAdminCategory(adminContext, type, name) {
    const { data, error } = await adminContext.client
        .from(categoryTables[type])
        .insert({ name })
        .select("id,name,is_active")
        .single();

    if (error?.code === "23505") {
        throw new ServiceError("CONFLICT", "Ya existe una categoria con ese nombre.");
    }
    if (error) throw error;
    return data;
}

export async function updateAdminCategory(adminContext, type, categoryId, changes) {
    return updateOne(
        adminContext.client
            .from(categoryTables[type])
            .update(changes)
            .eq("id", categoryId)
            .select("id,name,is_active")
            .maybeSingle(),
        "la categoria",
    );
}

export async function deactivateAdminCategory(adminContext, type, categoryId) {
    return updateAdminCategory(adminContext, type, categoryId, { is_active: false });
}

export async function listAdminCourses(adminContext) {
    return readRows(
        adminContext.client
            .from("courses")
            .select("id,title,status,created_at")
            .order("created_at", { ascending: false }),
    );
}

export async function setAdminCourseStatus(adminContext, courseId, status) {
    return updateOne(
        adminContext.client
            .from("courses")
            .update({ status })
            .eq("id", courseId)
            .select("id,title,status,created_at")
            .maybeSingle(),
        "el curso",
    );
}

export async function listAdminTopics(adminContext) {
    return readRows(
        adminContext.client
            .from("forum_topics")
            .select("id,title,body,status,created_at")
            .order("created_at", { ascending: false }),
    );
}

export async function setAdminTopicStatus(adminContext, topicId, status) {
    return updateOne(
        adminContext.client
            .from("forum_topics")
            .update({ status })
            .eq("id", topicId)
            .select("id,title,status")
            .maybeSingle(),
        "el tema",
    );
}

export async function listAdminReports(adminContext, statusFilter) {
    let query = adminContext.client
        .from("content_reports")
        .select("id,content_type,content_id,reason,description,status,created_at")
        .in("content_type", ["forum_topic", "forum_reply"])
        .order("created_at", { ascending: false });

    if (statusFilter === "open") query = query.eq("status", "open");
    if (statusFilter === "closed") query = query.neq("status", "open");

    const reports = await readRows(query);
    const topicIds = [...new Set(reports
        .filter(report => report.content_type === "forum_topic")
        .map(report => report.content_id))];
    const replyIds = [...new Set(reports
        .filter(report => report.content_type === "forum_reply")
        .map(report => report.content_id))];
    const [topics, replies] = await Promise.all([
        topicIds.length
            ? readRows(adminContext.client
                .from("forum_topics")
                .select("id,title,body,status")
                .in("id", topicIds))
            : [],
        replyIds.length
            ? readRows(adminContext.client
                .from("forum_replies")
                .select("id,topic_id,body,status")
                .in("id", replyIds))
            : [],
    ]);
    const topicById = new Map(topics.map(topic => [topic.id, topic]));
    const replyById = new Map(replies.map(reply => [reply.id, reply]));

    return reports.map(report => ({
        ...report,
        content: report.content_type === "forum_topic"
            ? topicById.get(report.content_id) || null
            : replyById.get(report.content_id) || null,
    }));
}

export async function decideAdminReport(adminContext, reportId, decision) {
    const report = await readReport(adminContext, reportId);

    if (report.status !== "open") {
        throw new ServiceError("CONFLICT", "El reporte ya fue atendido.");
    }
    if (!["forum_topic", "forum_reply"].includes(report.content_type)) {
        throw new ServiceError("BAD_REQUEST", "El tipo de contenido no se puede moderar.");
    }

    if (decision === "keep") {
        return updateOne(
            adminContext.client
                .from("content_reports")
                .update({ status: "resolved_keep" })
                .eq("id", reportId)
                .eq("status", "open")
                .select("id,content_type,content_id,reason,description,status,created_at")
                .maybeSingle(),
            "el reporte",
        );
    }

    const contentTable = report.content_type === "forum_topic" ? "forum_topics" : "forum_replies";
    await updateOne(
        adminContext.client
            .from(contentTable)
            .update({ status: "hidden" })
            .eq("id", report.content_id)
            .select("id")
            .maybeSingle(),
        "el contenido reportado",
    );

    const { data, error } = await adminContext.client
        .from("content_reports")
        .update({ status: "resolved_removed" })
        .eq("content_type", report.content_type)
        .eq("content_id", report.content_id)
        .eq("status", "open")
        .select("id,content_type,content_id,reason,description,status,created_at");

    if (error) throw error;
    if (!Array.isArray(data) || data.length === 0) {
        throw new ServiceError("CONFLICT", "El contenido se oculto, pero no se pudieron cerrar sus reportes.");
    }
    return data[0];
}

async function readReport(adminContext, reportId) {
    const { data, error } = await adminContext.client
        .from("content_reports")
        .select("id,content_type,content_id,reason,description,status,created_at")
        .eq("id", reportId)
        .maybeSingle();

    if (error) throw error;
    if (!data) throw new ServiceError("NOT_FOUND", "No se encontro el reporte.");
    return data;
}
