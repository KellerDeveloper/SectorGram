const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:19006",
  "http://localhost:8081",
  "https://sector.moscow",
  "https://www.sector.moscow",
  "https://api.sector.moscow",
];

function splitOrigins(rawOrigins) {
  if (!rawOrigins || typeof rawOrigins !== "string") {
    return [];
  }

  return rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getAllowedOrigins(rawOrigins = process.env.CORS_ORIGIN) {
  const configuredOrigins = splitOrigins(rawOrigins);

  if (configuredOrigins.length === 0) {
    return DEFAULT_ALLOWED_ORIGINS;
  }

  return [...new Set(configuredOrigins)];
}

export function getHttpCorsOptions(rawOrigins = process.env.CORS_ORIGIN) {
  const allowedOrigins = getAllowedOrigins(rawOrigins);
  const allowAll = allowedOrigins.includes("*");

  return {
    origin: allowAll
      ? true
      : (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
          }

          callback(new Error(`CORS blocked for origin: ${origin}`));
        },
    credentials: true,
  };
}

export function getSocketCorsOptions(rawOrigins = process.env.CORS_ORIGIN) {
  const allowedOrigins = getAllowedOrigins(rawOrigins);
  const allowAll = allowedOrigins.includes("*");

  return {
    origin: allowAll ? true : allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  };
}
