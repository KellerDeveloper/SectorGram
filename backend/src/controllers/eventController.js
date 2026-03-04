import {
  createEvent,
  listEvents,
  getEventById,
  joinEvent,
  leaveEvent,
  cancelEvent,
  updateEvent,
} from "../services/eventService.js";

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

