import fs from "fs/promises";
import { validateImplementedSlugsWithReport } from "../../src/controllers/loadSiteslugsController.js";

// Mock logger
jest.mock("../../src/loggers/logger.js", () => ({
  logger: jest.fn(),
}));

jest.mock("fs/promises");

describe("validateImplementedSlugsWithReport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns only valid slugs", async () => {
    fs.readdir.mockResolvedValue(["bookingOche.js", "agodaOche.js"]);
    const slugs = ["booking-com", "agoda-com", "fake-com"];

    const { validSlugs, report } = await validateImplementedSlugsWithReport(
      slugs
    );

    expect(validSlugs).toEqual(["booking-com", "agoda-com"]);
    expect(report.invalidSlugs).toBe(1);
    expect(report.missingOrchestrators).toEqual([
      { slug: "fake-com", expectedFile: "fakeOche.js" },
    ]);
  });

  test("returns error in report if slugs are empty but orchestrators exist", async () => {
    fs.readdir.mockResolvedValue(["tripOche.js", "expediaOche.js"]);

    const result = await validateImplementedSlugsWithReport([]);

    expect(result.validSlugs).toEqual([]);
    expect(result.report.error).toMatch(
      /slugs\.txt is empty.*orchestrator\(s\) found/
    );
  });

  test("returns empty slugs and no error if orchestrator folder is empty", async () => {
    fs.readdir.mockResolvedValue([]);

    const { validSlugs, report } = await validateImplementedSlugsWithReport([]);
    expect(validSlugs).toEqual([]);
    expect(report.implementedSites).toBe(0);
  });

  test("detects duplicates and reports them", async () => {
    fs.readdir.mockResolvedValue(["tripOche.js"]);

    const slugs = ["trip-com", "trip-net"];
    const { validSlugs, report } = await validateImplementedSlugsWithReport(
      slugs
    );

    expect(validSlugs).toEqual(["trip-com", "trip-net"]);
    expect(report.duplicateSites).toEqual([
      {
        siteName: "trip",
        count: 2,
        variants: ["trip-com", "trip-net"],
      },
    ]);
  });

  test("handles orchestrators that are not used in slugs", async () => {
    fs.readdir.mockResolvedValue(["tripOche.js", "googleOche.js"]);
    const slugs = ["trip-com"];

    const { validSlugs, report } = await validateImplementedSlugsWithReport(
      slugs
    );

    expect(validSlugs).toEqual(["trip-com"]);
    expect(report.unusedOrchestrators).toEqual(["googleOche.js"]);
  });

  test("rejects slugs with invalid TLD suffixes", async () => {
    fs.readdir.mockResolvedValue(["googleOche.js", "agodaOche.js"]);

    const slugs = ["google-com", "agoda-nl", "google-comasdasd", "agoda-xyz"];

    const { validSlugs, report } = await validateImplementedSlugsWithReport(
      slugs
    );

    expect(validSlugs).toEqual(["google-com", "agoda-nl"]);
    expect(report.invalidSlugs).toBe(2);
    expect(report.missingOrchestrators.map((e) => e.slug)).toEqual([
      "google-comasdasd",
      "agoda-xyz",
    ]);
  });

  test("handles invalid file names gracefully (ignores non-Oche.js files)", async () => {
    fs.readdir.mockResolvedValue(["tripOche.js", "README.md", "helper.js"]);
    const slugs = ["trip-com", "random-com"];

    const { validSlugs, report } = await validateImplementedSlugsWithReport(
      slugs
    );

    expect(validSlugs).toEqual(["trip-com"]);
    expect(report.invalidSlugs).toBe(1);
  });

  test("returns original slugs on unexpected fs error", async () => {
    fs.readdir.mockRejectedValue(new Error("Filesystem error"));

    const slugs = ["booking-com", "agoda-com"];
    const { validSlugs, report } = await validateImplementedSlugsWithReport(
      slugs
    );

    expect(validSlugs).toEqual(slugs);
    expect(report.error).toMatch(/Filesystem error/);
  });
});
