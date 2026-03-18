export function adminMiddleware(req, res, next) {
  // Админ — только по фиксированному userId (можно заменить env при необходимости)
  const fallbackAdminId = "69a5e6ee5ec53874d8fcc6b0";
  const adminIdFromEnv = process.env.ADMIN_USER_ID;
  const adminId = adminIdFromEnv || fallbackAdminId;

  const currentUserId = req.user?.id ? String(req.user.id) : null;

  if (!currentUserId) {
    return res.status(401).json({ error: "Токен не передан" });
  }

  if (currentUserId !== String(adminId)) {
    return res.status(403).json({ error: "Недостаточно прав" });
  }

  return next();
}

