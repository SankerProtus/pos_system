import { paymentStateMachine } from "../paymentStateMachine.service.js";

describe("paymentStateMachine", () => {
  test("allows PENDING to SUCCESS", () => {
    expect(paymentStateMachine.canTransition("PENDING", "SUCCESS")).toBe(true);
  });

  test("allows PENDING to FAILED", () => {
    expect(paymentStateMachine.canTransition("PENDING", "FAILED")).toBe(true);
  });

  test("rejects SUCCESS to FAILED", () => {
    expect(paymentStateMachine.canTransition("SUCCESS", "FAILED")).toBe(false);
  });

  test("assertTransition throws on illegal transition", () => {
    expect(() => {
      paymentStateMachine.assertTransition({
        fromStatus: "SUCCESS",
        toStatus: "FAILED",
        reference: "TEST-REF",
        source: "unit_test",
      });
    }).toThrow(/Illegal payment transition/i);
  });
});
