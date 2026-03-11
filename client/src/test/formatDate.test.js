import { formatDate } from "../utils/formatDate.js";
import { expect, test } from '@jest/globals';

test("formatDate.receitDateFormat returns formatted date string", () => {
  const testDate = new Date('2026-03-10T14:30:00');
  const result = formatDate.receitDateFormat(testDate);
  expect(result).toMatch(/March 10, 2026 at 02:30 PM/);
});

test("formatDate.reportDateFormat returns formatted date string", () => {
  const testDate = new Date('2026-03-10');
  const result = formatDate.reportDateFormat(testDate);
  expect(result).toMatch(/Mar 10, 2026/);
});

test("formatDate.reportDateFormat handles invalid date input", () => {
  const result = formatDate.reportDateFormat("invalid-date");
  expect(result).toBe("Invalid Date");
});