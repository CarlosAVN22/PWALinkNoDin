import { createClient } from "@supabase/supabase-js";
import { HttpError } from "../middleware/errorHandler.js";

function check(result) {
    if (result.error) throw result.error;
    return result.data;
}

function publicClient() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
        throw new HttpError(503, "Falta la configuración de Supabase.");
    }
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY);
}

function validId(value) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, "Identificador inválido.");
    return id;
}

async function account(context) {
    const user = check(await context.client.from("users")
        .select("id,role_id,status")
        .eq("auth_user_id", context.user.id).single());
    if (user.status !== "active") throw new HttpError(403, "Cuenta no activa.");
    return user;
}

export async function getPublishingPermission(context) {
    const user = await account(context);
    if (user.role_id === 3) return { allowed: true };
    if (user.role_id !== 2) return { allowed: false };
    const companies = check(await context.client.from("companies")
        .select("verification_status").eq("user_id", user.id));
    return { allowed: companies.some(company => company.verification_status === "verified") };
}

export async function getCourses(context) {
    const client = context?.client || publicClient();
    const [categories, courses, modules] = await Promise.all([
        client.from("course_categories").select("id,name,is_active").order("name"),
        client.from("courses").select("id,slug,title,description,level,status,category_id,duration_minutes,created_by,created_at").eq("status", "published").order("created_at", { ascending: false }),
        client.from("course_modules").select("id,course_id,title,description,content,video_url,video_storage_key,sort_order").order("sort_order"),
    ]);
    return { categories: check(categories), courses: check(courses), modules: check(modules) };
}

export async function getCourseProgress(context) {
    const user = await account(context);
    return check(await context.client.from("course_module_progress")
        .select("module_id,completed_at").eq("user_id", user.id));
}

export async function completeLesson(context, courseValue, moduleValue) {
    const user = await account(context);
    if (user.role_id !== 1) throw new HttpError(403, "Solo candidatos pueden registrar progreso.");
    const courseId = validId(courseValue);
    const moduleId = validId(moduleValue);
    const modules = check(await context.client.from("course_modules")
        .select("id").eq("id", moduleId).eq("course_id", courseId));
    if (!modules.length) throw new HttpError(404, "La lección no pertenece al curso.");
    const enrolled = await context.client.from("course_enrollments")
        .insert({ course_id: courseId, user_id: user.id });
    if (enrolled.error && enrolled.error.code !== "23505") throw enrolled.error;
    const completed = await context.client.from("course_module_progress")
        .insert({ user_id: user.id, module_id: moduleId, completed_at: new Date().toISOString() });
    if (completed.error?.code === "23505") {
        check(await context.client.from("course_module_progress")
            .update({ completed_at: new Date().toISOString() })
            .eq("user_id", user.id).eq("module_id", moduleId));
    } else if (completed.error) {
        throw completed.error;
    }
    return { module_id: moduleId, completed: true };
}

export async function publishCourse(context, values) {
    const user = await account(context);
    if (user.role_id !== 2 && user.role_id !== 3) {
        throw new HttpError(403, "Solo empresas y administradores pueden publicar cursos.");
    }
    if (user.role_id === 2) {
        const companies = check(await context.client.from("companies")
            .select("verification_status").eq("user_id", user.id));
        if (!companies.some(company => company.verification_status === "verified")) {
            throw new HttpError(403, "La empresa debe estar verificada.");
        }
    }
    const title = String(values?.title || "").trim();
    const description = String(values?.description || "").trim();
    const lessonTitle = String(values?.lesson_title || "").trim();
    const lessonText = String(values?.lesson_text || "").trim();
    const videoUrl = String(values?.video_url || "").trim();
    const storageKey = values?.video_storage_key || null;
    const duration = Number(values?.duration_minutes);
    const categoryId = validId(values?.category_id);
    if (title.length < 8 || description.length < 20 || !lessonTitle ||
        !Number.isSafeInteger(duration) || duration < 5 || duration > 1200 ||
        !["Básico", "Intermedio", "Avanzado"].includes(values?.level)) {
        throw new HttpError(400, "Revisa los campos del curso.");
    }

    const inserted = check(await context.client.from("courses").insert({
        slug: "curso-" + crypto.randomUUID(), title, description,
        level: values.level, category_id: categoryId,
        duration_minutes: duration, created_by: user.id,
    }).select("id").single());

    const module = await context.client.from("course_modules").insert({
        course_id: inserted.id, title: lessonTitle,
        description: lessonText || null, content: lessonText || null,
        video_url: videoUrl || null, video_storage_key: storageKey,
        sort_order: 1, duration_minutes: duration,
    });

    if (module.error) {
        await context.client.from("courses").update({ status: "hidden" }).eq("id", inserted.id);
        throw module.error;
    }
    return { id: inserted.id };
}

export async function getForumCategories(context) {
    return check(await (context?.client || publicClient()).from("forum_categories")
        .select("id,name,is_active").order("name"));
}

export async function getTopics(context) {
    return check(await (context?.client || publicClient()).from("forum_topics")
        .select("id,title,body,author_id,category_id,status,created_at")
        .order("created_at", { ascending: false }));
}

export async function getTopic(context, value) {
    const client = context?.client || publicClient();
    return check(await client.from("forum_topics")
        .select("id,title,body,status,author_id,category_id,created_at")
        .eq("id", validId(value)).single());
}

export async function createTopic(context, values) {
    const user = await account(context);
    const title = String(values?.title || "").trim();
    const body = String(values?.body || "").trim();
    const categoryId = validId(values?.category_id);
    if (title.length < 8 || title.length > 220 || body.length < 20 || body.length > 4000) {
        throw new HttpError(400, "Revisa el título y la descripción.");
    }
    check(await context.client.from("forum_topics").insert({
        title, body, category_id: categoryId, author_id: user.id,
    }));
    return { created: true };
}

export async function getReplies(context, value) {
    const client = context?.client || publicClient();
    return check(await client.from("forum_replies")
        .select("id,topic_id,author_id,body,status,created_at")
        .eq("topic_id", validId(value)).order("created_at", { ascending: true }));
}

export async function getAuthorNames(context, value) {
    const client = context?.client || publicClient();
    return check(await client.rpc("ln26_forum_author_names", { p_topic_id: validId(value) }));
}

export async function createReply(context, topicValue, values) {
    const user = await account(context);
    const topicId = validId(topicValue);
    const body = String(values?.body || "").trim();
    if (!body || body.length > 1000) throw new HttpError(400, "Respuesta inválida.");
    check(await context.client.from("forum_replies")
        .insert({ topic_id: topicId, author_id: user.id, body }));
    return { created: true };
}

export async function hideReply(context, replyValue) {
    const user = await account(context);
    check(await context.client.from("forum_replies").update({ status: "hidden" })
        .eq("id", validId(replyValue)).eq("author_id", user.id));
    return { hidden: true };
}

export async function reportContent(context, values) {
    const user = await account(context);
    const allowed = ["forum_topic", "forum_reply"];
    if (!allowed.includes(values?.content_type)) throw new HttpError(400, "Tipo de contenido inválido.");
    const reason = String(values?.reason || "").trim();
    const description = String(values?.description || "").trim();
    if (!reason || description.length > 800) throw new HttpError(400, "Motivo inválido.");
    check(await context.client.from("content_reports").insert({
        reporter_id: user.id, content_type: values.content_type,
        content_id: validId(values.content_id), reason,
        description: description || null,
    }));
    return { created: true };
}
