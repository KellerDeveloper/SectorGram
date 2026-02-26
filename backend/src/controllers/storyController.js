import {
  createStory,
  getStoriesFeed,
  getStoriesByUserId,
  markStoryViewed,
  deleteStory,
} from "../services/storyService.js";

export async function create(req, res, next) {
  try {
    const userId = req.user.id;
    const { type, media, text } = req.body || {};
    const story = await createStory({ userId, type, media, text });
    res.status(201).json(story);
  } catch (error) {
    next(error);
  }
}

export async function getFeed(req, res, next) {
  try {
    const userId = req.user.id;
    const feed = await getStoriesFeed(userId);
    res.json(feed);
  } catch (error) {
    next(error);
  }
}

export async function getByUser(req, res, next) {
  try {
    const currentUserId = req.user.id;
    const targetUserId = req.params.userId;
    const data = await getStoriesByUserId(currentUserId, targetUserId);
    if (!data) {
      return res.status(404).json({ error: "Истории не найдены или истекли" });
    }
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function markViewed(req, res, next) {
  try {
    const viewerUserId = req.user.id;
    const storyId = req.params.id;
    await markStoryViewed(storyId, viewerUserId);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const userId = req.user.id;
    const storyId = req.params.id;
    const result = await deleteStory(storyId, userId);
    if (!result) {
      return res.status(404).json({ error: "История не найдена" });
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
}
