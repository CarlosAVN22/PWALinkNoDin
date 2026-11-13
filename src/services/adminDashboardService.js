async function countRows(client, table, column, value) {
    let query = client.from(table).select("id", { count: "exact", head: true });

    if (column) {
        query = query.eq(column, value);
    }

    const { count, error } = await query;
    if (error) throw error;
    if (!Number.isInteger(count)) {
        throw new Error(`Supabase no devolvio el conteo de ${table}.`);
    }
    return count;
}

export async function getAdminDashboard(adminContext) {
    const { client } = adminContext;
    const [
        companies,
        pendingCompanies,
        courses,
        publishedCourses,
        hiddenCourses,
        forumTopics,
        openReports,
    ] = await Promise.all([
        countRows(client, "companies"),
        countRows(client, "companies", "verification_status", "pending"),
        countRows(client, "courses"),
        countRows(client, "courses", "status", "published"),
        countRows(client, "courses", "status", "hidden"),
        countRows(client, "forum_topics"),
        countRows(client, "content_reports", "status", "open"),
    ]);

    return {
        companies,
        pendingCompanies,
        courses,
        publishedCourses,
        hiddenCourses,
        forumTopics,
        openReports,
    };
}
