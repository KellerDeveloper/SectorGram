import {
  createEvent,
  listEvents,
  getEventById,
  joinEvent,
  leaveEvent,
  cancelEvent,
  updateEvent,
} from "../services/eventService.js";

function formatDateToICal(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) {
    return "";
  }

  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());

  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

function escapeICalText(text) {
  if (!text) return "";
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function buildEventIcsFileNames(event) {
  const rawTitle = event.title || "Событие";
  const sanitizedTitle = String(rawTitle)
    // убираем управляющие символы, переводы строк и пр.
    .replace(/[\x00-\x1F\x7F]+/g, " ")
    // убираем символы, недопустимые в имени файла
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const title = sanitizedTitle || "Событие";

  const startsAt = event.startsAt ? new Date(event.startsAt) : null;
  let dateSuffix = "";

  if (startsAt && !Number.isNaN(startsAt.getTime())) {
    const pad = (n) => String(n).padStart(2, "0");
    const dd = pad(startsAt.getDate());
    const mm = pad(startsAt.getMonth() + 1);
    const yyyy = startsAt.getFullYear();
    dateSuffix = ` ${yyyy}-${mm}-${dd}`;
  }

  const baseUnicode = (title + dateSuffix).trim() || "event";
  const unicodeFileName = `${baseUnicode}.ics`;

  // ASCII-представление для безопасного header filename=
  const baseAscii =
    baseUnicode
      .replace(/[^\x20-\x7E]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "event";
  const asciiFileName = `${baseAscii}.ics`;

  return { unicodeFileName, asciiFileName };
}

export async function create(req, res, next) {
  try {
    const creatorId = req.user.id;
    const {
      title,
      description,
      startsAt,
      endsAt,
      place,
      coverImage,
      location,
    } = req.body || {};

    const event = await createEvent({
      creatorId,
      title,
      description,
      startsAt,
      endsAt,
      place,
      coverImage,
      location,
    });

    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
}

export async function getAll(req, res, next) {
  try {
    const events = await listEvents();
    res.json(events);
  } catch (error) {
    next(error);
  }
}

export async function getOne(req, res, next) {
  try {
    const eventId = req.params.id;
    const event = await getEventById(eventId);
    res.json(event);
  } catch (error) {
    next(error);
  }
}

export async function downloadIcs(req, res, next) {
  try {
    const eventId = req.params.id;
    const event = await getEventById(eventId);

    const startsAt = event.startsAt ? new Date(event.startsAt) : null;
    const endsAt = event.endsAt ? new Date(event.endsAt) : null;

    if (!startsAt || Number.isNaN(startsAt.getTime())) {
      const error = new Error("Дата начала мероприятия не задана");
      error.status = 400;
      throw error;
    }

    const dtStart = formatDateToICal(startsAt);
    const dtEnd = formatDateToICal(
      endsAt && !Number.isNaN(endsAt.getTime())
        ? endsAt
        : new Date(startsAt.getTime() + 2 * 60 * 60 * 1000)
    );

    const now = new Date();
    const dtStamp = formatDateToICal(now);

    const uidDomain = "sektor.moscow";
    const uid = `${event.id || eventId}@${uidDomain}`;

    const summary = escapeICalText(event.title || "Событие");
    const description = escapeICalText(event.description || "");
    const location = escapeICalText(event.place || "");

    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Sektor//Events//RU",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      description ? `DESCRIPTION:${description}` : null,
      location ? `LOCATION:${location}` : null,
      "END:VEVENT",
      "END:VCALENDAR",
    ].filter(Boolean);

    const icsContent = lines.join("\r\n");

    const { unicodeFileName, asciiFileName } = buildEventIcsFileNames(event);
    const encodedUnicode = encodeURIComponent(unicodeFileName);
    const contentDisposition = `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodedUnicode}`;

    // Для браузеров и iOS корректный тип — text/calendar.
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", contentDisposition);
    res.send(icsContent);
  } catch (error) {
    next(error);
  }
}

export async function join(req, res, next) {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;

    const event = await joinEvent({ eventId, userId });
    res.json(event);
  } catch (error) {
    next(error);
  }
}

export async function leave(req, res, next) {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;

    const event = await leaveEvent({ eventId, userId });
    res.json(event);
  } catch (error) {
    next(error);
  }
}

export async function cancel(req, res, next) {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;

    const event = await cancelEvent({ eventId, userId });
    res.json(event);
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;
    const {
      title,
      description,
      startsAt,
      endsAt,
      place,
      coverImage,
      location,
    } = req.body || {};

    const event = await updateEvent({
      eventId,
      userId,
      title,
      description,
      startsAt,
      endsAt,
      place,
      coverImage,
      location,
    });

    res.json(event);
  } catch (error) {
    next(error);
  }
}

