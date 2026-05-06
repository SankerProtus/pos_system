import { hashRequestPayload } from "../../utils/requestHash.js";

describe("hashRequestPayload", () => {
  test("produces stable hash for same semantic payload", () => {
    const first = hashRequestPayload({
      method: "POST",
      path: "POST:/payments/initialize",
      body: {
        amount: 100,
        paymentMethod: "MOBILE_MONEY",
        nested: { b: 2, a: 1 },
      },
    });

    const second = hashRequestPayload({
      method: "POST",
      path: "POST:/payments/initialize",
      body: {
        paymentMethod: "MOBILE_MONEY",
        amount: 100,
        nested: { a: 1, b: 2 },
      },
    });

    expect(first).toBe(second);
  });

  test("changes hash when payload changes", () => {
    const first = hashRequestPayload({
      method: "POST",
      path: "POST:/payments/cancel",
      body: { reference: "MOMO-1", reason: "Cancel" },
    });

    const second = hashRequestPayload({
      method: "POST",
      path: "POST:/payments/cancel",
      body: { reference: "MOMO-1", reason: "Different reason" },
    });

    expect(first).not.toBe(second);
  });
});
