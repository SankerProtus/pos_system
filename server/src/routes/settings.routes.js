import express from "express";
import { settingsRepository } from "../repositories/settings.repository.js";
const router = express.Router();

router.get("/", async (req, res) => {
  const group = req.query.group;
  const settings = await settingsRepository.getAll(group);
  res.json(settings);
});

router.patch("/", async (req, res) => {
  // Only allow valid fields for the Setting model
  const allowedFields = [
    "storeName",
    "storeAddress",
    "storeTaxId",
    "currency",
    "language",
    "theme",
    "receiptFooter",
    "businessHours",
    "taxRate",
    "createdAt",
    "updatedAt",
  ];
  const filteredData = {};
  for (const key of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      filteredData[key] = req.body[key];
    }
  }
  try {
    // Get the current settings row (assume only one row exists)
    const current = await settingsRepository.getAll();
    if (!current) {
      return res.status(404).json({ error: "Settings not found" });
    }
    // Update with only allowed fields
    const updated = await settingsRepository.update(current.id, filteredData);
    res.json(updated);
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message || "Failed to update settings" });
  }
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
