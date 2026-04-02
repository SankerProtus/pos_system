import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { settingsRepository } from "../repositories/settings.repository.js";
import {
  authenticateToken,
  requireRole,
} from "../middlewares/auth.middleware.js";
const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backupDirectory = path.resolve(__dirname, "../../logs/backups");

const ALLOWED_FIELDS = [
  "storeName",
  "storeAddress",
  "storeTaxId",
  "currency",
  "language",
  "theme",
  "receiptHeaderText",
  "receiptFooter",
  "receiptPaperWidth",
  "autoPrint",
  "showLoyaltyPoints",
  "showStoreLogo",
  "businessHours",
  "taxRate",
  "pointsPerGHC",
  "ghcPerPoint",
  "minimumPointsToRedeem",
];

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeIncomingSettings = (payload = {}) => {
  const normalized = {};

  // Canonical model fields.
  for (const key of ALLOWED_FIELDS) {
    if (
      Object.prototype.hasOwnProperty.call(payload, key) &&
      payload[key] !== undefined
    ) {
      normalized[key] = payload[key];
    }
  }

  // Backward-compatible aliases from the current frontend.
  if (Object.prototype.hasOwnProperty.call(payload, "vatTIN")) {
    if (payload.vatTIN !== undefined) normalized.storeTaxId = payload.vatTIN;
  }

  if (Object.prototype.hasOwnProperty.call(payload, "currencySymbol")) {
    if (payload.currencySymbol !== undefined) {
      normalized.currency = payload.currencySymbol;
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, "receiptFooterText")) {
    if (payload.receiptFooterText !== undefined) {
      normalized.receiptFooter = payload.receiptFooterText;
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, "globalVatRate")) {
    const taxRatePercent = toNumber(payload.globalVatRate);
    if (taxRatePercent !== undefined) {
      normalized.taxRate = taxRatePercent / 100;
    }
  }

  return normalized;
};

const withClientAliases = (settings) => {
  if (!settings) return settings;

  const taxRate = toNumber(settings.taxRate);

  return {
    ...settings,
    vatTIN: settings.storeTaxId,
    currencySymbol: settings.currency,
    receiptFooterText: settings.receiptFooter,
    globalVatRate: taxRate !== undefined ? taxRate * 100 : undefined,
  };
};

const getLastBackupISO = async () => {
  try {
    const entries = await fs.readdir(backupDirectory, { withFileTypes: true });
    const jsonFiles = entries.filter(
      (entry) => entry.isFile() && entry.name.endsWith(".json"),
    );

    if (!jsonFiles.length) return null;

    let newest = null;
    for (const file of jsonFiles) {
      const fullPath = path.join(backupDirectory, file.name);
      const stat = await fs.stat(fullPath);
      if (!newest || stat.mtimeMs > newest.mtimeMs) {
        newest = { mtimeMs: stat.mtimeMs };
      }
    }

    return newest ? new Date(newest.mtimeMs).toISOString() : null;
  } catch {
    return null;
  }
};

router.use(authenticateToken, requireRole("ADMIN"));

router.get("/", async (req, res) => {
  try {
    const settings = await settingsRepository.getOne();
    const response = withClientAliases(settings);
    if (!response) {
      return res.json(response);
    }

    response.lastBackup = await getLastBackupISO();
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to load settings" });
  }
});

router.patch("/", async (req, res) => {
  const filteredData = normalizeIncomingSettings(req.body);

  if (!Object.keys(filteredData).length) {
    return res.status(400).json({
      error: "No valid settings fields provided",
    });
  }

  try {
    const updated = await settingsRepository.upsertOne(filteredData);
    res.json(withClientAliases(updated));
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message || "Failed to update settings" });
  }
});

router.post("/backup", async (req, res) => {
  try {
    const settings = await settingsRepository.getOne();

    await fs.mkdir(backupDirectory, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[.:]/g, "-");
    const fileName = `settings-backup-${timestamp}.json`;
    const filePath = path.join(backupDirectory, fileName);

    const payload = {
      backedUpAt: new Date().toISOString(),
      byUserId: req.user?.id || null,
      settings,
    };

    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8");

    res.status(201).json({
      message: "Backup created successfully",
      fileName,
      backedUpAt: payload.backedUpAt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to create backup" });
  }
});

export { router as settingsRouter };
