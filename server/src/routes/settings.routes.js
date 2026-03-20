import express from "express";
import { settingsRepository } from "../repositories/settings.repository.js";
const router = express.Router();

router.get("/", async (req, res) => {
  const group = req.query.group;
  const settings = await settingsRepository.getAll(group);
  res.json(settings);
});

router.get("/:key", async (req, res) => {
  const setting = await settingsRepository.getByKey(req.params.key);
  if (!setting) return res.status(404).json({ error: "Setting not found" });
  res.json(setting);
});

router.put("/:key", async (req, res) => {
  const { value } = req.body;
  const updated = await settingsRepository.update(req.params.key, value);
  res.json(updated);
});

export { router as settingsRouter };