import request from "supertest";
import { createApp } from "../src/app.js";

describe("Auth API", () => {
  const app = createApp();

  beforeAll(() => {
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = "test-secret";
    }
  });

  it("регистрирует и логинит пользователя", async () => {
    const email = "test@example.com";
    const password = "password123";
    const name = "Test User";

    const registerRes = await request(app)
      .post("/auth/register")
      .send({ email, password, name });

    expect(registerRes.status).toBe(200);
    expect(registerRes.body).toHaveProperty("token");
    expect(registerRes.body).toHaveProperty("user");
    expect(registerRes.body.user.email).toBe(email);

    const loginRes = await request(app)
      .post("/auth/login")
      .send({ email, password });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty("token");
    expect(loginRes.body).toHaveProperty("user");
    expect(loginRes.body.user.email).toBe(email);
  });
});


