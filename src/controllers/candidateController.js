
import {
  getCandidateDashboard
} from "../services/candidateService.js";

import {
  listarVacantes,
  detalleVacante,
  listarGuardados,
  agregarGuardado,
  eliminarGuardado,
  listarPostulaciones,
  enviarPostulacion
} from "../services/candidateActivityService.js";

function responder(operacion, codigo = 200) {
  return async (req, res, next) => {
    try {
      const data = await operacion(
        req.candidateContext,
        req.params,
        req.body
      );
      res.status(codigo).json({ data });
    } catch (error) {
      next(error);
    }
  };
}

export const getDashboard = responder(
  contexto => getCandidateDashboard(contexto)
);

export const getJobs = responder(
  contexto => listarVacantes(contexto)
);

export const getJob = responder(
  (contexto, params) => detalleVacante(contexto, params.jobId)
);

export const getSaved = responder(
  contexto => listarGuardados(contexto)
);

export const saveJob = responder(
  (contexto, params) => agregarGuardado(contexto, params.jobId),
  201
);

export const deleteSaved = responder(
  (contexto, params) => eliminarGuardado(contexto, params.jobId)
);

export const getApplications = responder(
  contexto => listarPostulaciones(contexto)
);

export const postApplication = responder(
  (contexto, params, body) => enviarPostulacion(contexto, body),
  201
);
