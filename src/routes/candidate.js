
import { Router } from "express";

import { createUserAuth } from "../middleware/userAuth.js";
import { requireCandidate } from "../middleware/candidateAuth.js";

import {
  getDashboard,
  getJobs,
  getJob,
  getSaved,
  saveJob,
  deleteSaved,
  getApplications,
  postApplication
} from "../controllers/candidateController.js";

export function createCandidateRouter() {
  const router = Router();

  router.use(createUserAuth());
  router.use(requireCandidate);

  router.get("/dashboard", getDashboard);

  router.get("/jobs", getJobs);
  router.get("/jobs/:jobId", getJob);

  router.get("/saved", getSaved);
  router.post("/saved/:jobId", saveJob);
  router.delete("/saved/:jobId", deleteSaved);

  router.get("/applications", getApplications);
  router.post("/applications", postApplication);

  return router;
}
