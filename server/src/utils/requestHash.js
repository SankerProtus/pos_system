import crypto from "crypto";

const stableSerialize = (value) => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }

  const keys = Object.keys(value).sort();
  const serialized = keys.map((key) => {
    return `${JSON.stringify(key)}:${stableSerialize(value[key])}`;
  });

  return `{${serialized.join(",")}}`;
};

export const hashRequestPayload = ({ method, path, body }) => {
  const raw = stableSerialize({
    method: String(method || "").toUpperCase(),
    path: String(path || ""),
    body: body || {},
  });

  return crypto.createHash("sha256").update(raw).digest("hex");
};
