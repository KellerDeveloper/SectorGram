import request from "supertest";
import { createApp } from "../src/app.js";

describe("Chats API", () => {
  // Для HTTP-слоя нам нужны chatHelpers, которые в проде подвешиваются в server.js
  const app = createApp();
  app.locals.chatHelpers = {
    getOnlineUsers: () => [],
    isUserOnline: () => false,
  };

  beforeAll(() => {
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = "test-secret";
    }
  });

  async function registerAndLogin() {
    const email = "chat-user@example.com";
    const password = "password123";
    const name = "Chat User";

    await request(app).post("/auth/register").send({ email, password, name });

    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email, password });

    return {
      token: loginRes.body.token,
    };
  }

  it("возвращает список чатов для залогиненного пользователя", async () => {
    const { token } = await registerAndLogin();

    const res = await request(app)
      .get("/chats")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});


