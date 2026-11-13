async function countRows(client, table, column, value) {
    let query = client.from(table).select("*", { count: "exact", head: true });

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
    const client = adminContext.adminClient || adminContext.client;
    const [
        registeredUsers,
        companies,
        pendingCompanies,
        verifiedCompanies,
        jobs,
        activeJobs,
        applications,
        candidateProfiles,
        courses,
        publishedCourses,
        hiddenCourses,
        forumTopics,
        openReports,
        totalReports,
        recentActivityResult,
    ] = await Promise.all([
        countRows(client, "users"),
        countRows(client, "companies"),
        countRows(client, "companies", "verification_status", "pending"),
        countRows(client, "companies", "verification_status", "verified"),
        countRows(client, "jobs"),
        countRows(client, "jobs", "status", "active"),
        countRows(client, "applications"),
        countRows(client, "candidate_profiles"),
        countRows(client, "courses"),
        countRows(client, "courses", "status", "published"),
        countRows(client, "courses", "status", "hidden"),
        countRows(client, "forum_topics"),
        countRows(client, "content_reports", "status", "open"),
        countRows(client, "content_reports"),
        client.from("admin_audit_log")
            .select("id,action,affected_record,occurred_at")
            .order("occurred_at", { ascending: false })
            .limit(3),
    ]);

    if (recentActivityResult.error) throw recentActivityResult.error;

    return {
        registeredUsers,
        companies,
        pendingCompanies,
        verifiedCompanies,
        jobs,
        activeJobs,
        applications,
        candidateProfiles,
        courses,
        publishedCourses,
        hiddenCourses,
        forumTopics,
        openReports,
        totalReports,
        resolvedReports: totalReports - openReports,
        recentActivity: recentActivityResult.data || [],
    };
}
