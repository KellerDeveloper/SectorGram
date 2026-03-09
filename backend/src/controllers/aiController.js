import {
  checkAvailability,
  complete,
} from "../services/yandexGptService.js";

/**
 * GET /ai/health
 * Проверка доступности YandexGPT без генерации текста.
 */
export async function health(req, res, next) {
  try {
    const status = await checkAvailability();
    res.status(200).json({
      ok: status.available,
      yandexGpt: status.available ? "available" : "unavailable",
      reason: status.reason ?? null,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /ai/suggest-event-description
 * Тело: { title?, place?, draft? }
 * Возвращает: { description } или { error }
 */
export async function suggestEventDescription(req, res, next) {
  try {
    const { title = "", place = "", draft = "" } = req.body || {};

    const promptParts = [];
    if (title.trim()) promptParts.push(`Название мероприятия: ${title.trim()}`);
    if (place.trim()) promptParts.push(`Место: ${place.trim()}`);
    if (draft.trim()) {
      promptParts.push(`Черновик описания (можно дополнить или переписать): ${draft.trim()}`);
    }
    if (!promptParts.length) {
      return res.status(400).json({
        error: "Укажите хотя бы title, place или draft.",
      });
    }

    const userPrompt = promptParts.join("\n");
    const systemPrompt =
      "Ты помогаешь создавать краткие анонсы мероприятий. " +
      "Ответь только текстом описания для анонса: 1–2 абзаца, нейтральный стиль, без приветствий и пояснений. " +
      "Пиши на русском языке.";

    const result = await complete(userPrompt, {
      systemPrompt,
      maxTokens: 400,
      temperature: 0.5,
    });

    if (result.error) {
      return res.status(503).json({ error: result.error });
    }

    res.status(200).json({ description: result.text });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /ai/suggest-meeting-idea
 * Тело: { city?, exclude? } — город и список уже предложенных вариантов
 * Возвращает: { ideas } — текст с 2–3 новыми идеями (без повторов)
 */
export async function suggestMeetingIdea(req, res, next) {
  try {
    const { city = "Москва", exclude } = req.body || {};
    const cityStr =
      typeof city === "string" ? city.trim() || "Москва" : "Москва";

    const excludeLines = Array.isArray(exclude)
      ? exclude
          .map((v) => (typeof v === "string" ? v.trim() : ""))
          .filter(Boolean)
      : [];

    let userPrompt = `Подскажи 2–3 идеи для встречи или мероприятия в городе: ${cityStr}.`;
    if (excludeLines.length) {
      userPrompt +=
        "\nРанее уже были предложены такие варианты (не повторяй их):\n" +
        excludeLines.join("\n");
    }

    const systemPrompt =
      "Ты помогаешь придумать идеи, куда сходить с друзьями или коллегами. " +
      "Ответь списком из 2–3 вариантов. Каждый вариант в одной строке в формате: «Название — Адрес или место». " +
      "Не повторяй варианты из списка, если он указан. Без нумерации и лишних слов. Пример: Боулинг — ул. Тверская, 1. Пиши на русском.";

    const result = await complete(userPrompt, {
      systemPrompt,
      maxTokens: 350,
      temperature: 0.7,
    });

    if (result.error) {
      return res.status(503).json({ error: result.error });
    }

    res.status(200).json({ ideas: result.text });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /ai/improve-text
 * Тело: { text }
 * Возвращает: { text } или { error }
 */
export async function improveText(req, res, next) {
  try {
    const { text } = req.body || {};
    const systemPrompt =
      "Отредактируй текст: исправь орфографию и пунктуацию, сделай формулировки яснее. " +
      "Сохрани смысл и тон. Ответь только отредактированным текстом, без пояснений. Язык — русский.";

    const result = await complete(text, {
      systemPrompt,
      maxTokens: 600,
      temperature: 0.3,
    });

    if (result.error) {
      return res.status(503).json({ error: result.error });
    }

    res.status(200).json({ text: result.text });
  } catch (error) {
    next(error);
  }
}
