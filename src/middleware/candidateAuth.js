
export async function requireCandidate(req, res, next) {
  try {
    const { data, error } = await req.userContext.client
      .from("users")
      .select("id, role_id, status")
      .eq("auth_user_id", req.userContext.user.id)
      .maybeSingle();

    if (error) throw error;

    if (!data || data.role_id !== 1 || data.status !== "active") {
      return res.status(403).json({
        error: "Solo los candidatos activos pueden acceder."
      });
    }

    req.candidateContext = {
      client: req.userContext.client,
      candidateId: data.id
    };

    next();
  } catch (error) {
    next(error);
  }
}
