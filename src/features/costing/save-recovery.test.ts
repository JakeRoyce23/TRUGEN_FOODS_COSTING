import { clearSaveRecovery, readFailedSave, rememberFailedSave } from "./save-recovery";

it("recovers only the same owner's route and clears on explicit logout", () => {
  const recovery = { input: { foodName: "Private", servings: "10", markup: "35", rounding: "none" as const, ingredients: [] }, recordId: "record", requestId: "request", version: null };
  rememberFailedSave("owner", "new", recovery);
  expect(readFailedSave("other", "new")).toBeUndefined();
  expect(readFailedSave("owner", "different-record")).toBeUndefined();
  expect(readFailedSave("owner", "new")).toEqual(recovery);
  clearSaveRecovery(); expect(readFailedSave("owner", "new")).toBeUndefined();
});
