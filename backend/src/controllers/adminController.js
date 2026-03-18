import {
  getAdminUsers,
  getAdminUserDetails,
  adminSetEventStatus,
  listAdminEvents,
  getAdminReminders,
  sendAdminReminderNow,
  resetAdminReminder,
  broadcastAdmin,
  statsUsersAdmin,
  statsEventsAdmin,
  getAdminAudit,
} from "../services/adminService.js";

export async function getAdminUsersController(req, res, next) {
  try {
    const { query, limit, offset } = req.query || {};
    const result = await getAdminUsers({ query, limit, offset });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getAdminUserDetailsController(req, res, next) {
  try {
    const { id } = req.params;
    const result = await getAdminUserDetails(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function adminCancelEventController(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const result = await adminSetEventStatus({
      adminId,
      eventId: id,
      status: "cancelled",
      actionName: "admin.event.cancel",
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function adminCompleteEventController(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const result = await adminSetEventStatus({
      adminId,
      eventId: id,
      status: "completed",
      actionName: "admin.event.complete",
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function listAdminEventsController(req, res, next) {
  try {
    const { status, limit, offset } = req.query || {};
    const result = await listAdminEvents({ status, limit, offset });
    res.json({ items: result });
  } catch (error) {
    next(error);
  }
}

export async function getAdminRemindersController(req, res, next) {
  try {
    const { eventId, userId, sent } = req.query || {};
    const reminders = await getAdminReminders({ eventId, userId, sent });
    res.json({ items: reminders });
  } catch (error) {
    next(error);
  }
}

export async function sendAdminReminderNowController(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const result = await sendAdminReminderNow({ adminId, reminderId: id });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function resetAdminReminderController(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;
    const result = await resetAdminReminder({ adminId, reminderId: id });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function broadcastAdminController(req, res, next) {
  try {
    const adminId = req.user.id;
    const result = await broadcastAdmin({ adminId, body: req.body || {} });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function statsUsersAdminController(req, res, next) {
  try {
    const { limit } = req.query || {};
    const result = await statsUsersAdmin({ limit });
    res.json({ items: result });
  } catch (error) {
    next(error);
  }
}

export async function statsEventsAdminController(req, res, next) {
  try {
    const { limit } = req.query || {};
    const result = await statsEventsAdmin({ limit });
    res.json({ items: result });
  } catch (error) {
    next(error);
  }
}

export async function getAdminAuditController(req, res, next) {
  try {
    const { limit, offset } = req.query || {};
    const result = await getAdminAudit({ limit, offset });
    res.json({ items: result });
  } catch (error) {
    next(error);
  }
}

