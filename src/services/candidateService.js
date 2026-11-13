
async function consultar(consulta) {
  const { data, error } = await consulta;
  if (error) throw error;
  return data;
}

export async function getCandidateDashboard(context) {
  const { client, candidateId } = context;

  const [postulaciones, guardados, vacantes, empresas] =
    await Promise.all([
      consultar(
        client.from("applications")
          .select("id, status")
          .eq("candidate_id", candidateId)
      ),
      consultar(
        client.from("saved_jobs")
          .select("job_id")
          .eq("candidate_id", candidateId)
      ),
      consultar(
        client.from("jobs")
          .select(
            "id, title, company_id, city, modality, application_deadline"
          )
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(10)
      ),
      consultar(
        client.from("companies")
          .select("id, commercial_name")
          .eq("verification_status", "verified")
      )
    ]);

  const nombres = new Map(
    empresas.map(e => [e.id, e.commercial_name])
  );

  const hoy = new Date().toISOString().slice(0, 10);

  const recientes = vacantes
    .filter(v =>
      nombres.has(v.company_id) &&
      (!v.application_deadline || v.application_deadline >= hoy)
    )
    .map(v => ({
      id: v.id,
      title: v.title,
      company: nombres.get(v.company_id),
      city: v.city,
      modality: v.modality
    }));

  return {
    postulaciones: postulaciones.length,
    enRevision: postulaciones.filter(p =>
      ["reviewing", "interview"].includes(p.status)
    ).length,
    guardados: guardados.length,
    vacantes: recientes
  };
}
