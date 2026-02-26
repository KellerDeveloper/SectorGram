describe("authService (smoke)", () => {
  it("может быть импортирован при установленном JWT_SECRET", async () => {
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = "test-secret";
    }

    const mod = await import("../src/services/authService.js");

    expect(typeof mod.generateToken).toBe("function");
    expect(typeof mod.registerUser).toBe("function");
    expect(typeof mod.loginUser).toBe("function");
  });
});



