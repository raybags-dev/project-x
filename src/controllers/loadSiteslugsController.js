import fs from "fs/promises";
import { logger } from "../loggers/logger.js";

/**
 * Validates slugs against implemented orchestrators
 * @param {string[]} slugs - Array of slugs from slugs.txt
 * @returns {Promise<string[]>} - Array of validated slugs
 */
export async function validateImplementedSlugs(slugs) {
  try {
    const orchestratorsPath = "../ochestrators";

    // Read all files in orchestrators directory
    const orchestratorFiles = await fs.readdir(orchestratorsPath);
    // Extract site names from orchestrator files (remove 'Oche.js' suffix)
    const implementedSites = orchestratorFiles
      .filter((file) => file.endsWith("Oche.js"))
      .map((file) => file.replace("Oche.js", "").toLowerCase());

    logger(
      `Found ${
        implementedSites.length
      } implemented orchestrators: ${implementedSites.join(", ")}`,
      "info"
    );

    const validatedSlugs = [];
    const slugCounts = {};

    for (const slug of slugs) {
      const siteName = slug
        .replace(/-(com|nl|org|net|co\.uk|de|fr|it|es|au|ca|jp|br)$/i, "")
        .toLowerCase();

      // Count occurrences of each site name
      slugCounts[siteName] = (slugCounts[siteName] || 0) + 1;

      // Check if orchestrator exists for this site
      if (implementedSites.includes(siteName)) {
        validatedSlugs.push(slug);
        logger(
          `✅ Validated slug: ${slug} (orchestrator: ${siteName}Oche.js)`,
          "info"
        );
      } else {
        logger(
          `⚠️ WARNING: Slug '${slug}' has no corresponding implementation orchestrator fike: '${siteName}Oche.js'`,
          "warn"
        );
      }
    }

    // Check for sites that appear more than once
    const duplicateSites = Object.entries(slugCounts)
      .filter(([siteName, count]) => count > 1)
      .map(([siteName]) => siteName);

    if (duplicateSites.length > 0) {
      logger(
        `⚠️ WARNING: Sites with multiple domain variants: ${duplicateSites.join(
          ", "
        )}`,
        "warn"
      );
    }

    logger(
      `Validation complete: ${validatedSlugs.length}/${slugs.length} slugs validated`,
      "info"
    );

    return validatedSlugs;
  } catch (error) {
    logger(`Error validating slugs: ${error.message}`, "error");
    return []; // or throw error if you want client to know validation failed
  }
}
/**
 * Enhanced version that provides detailed validation report
 * @param {string[]} slugs - Array of slugs from slugs.txt
 * @returns {Promise<{validSlugs: string[], report: object}>} - Validation results with detailed report
 */
export async function validateImplementedSlugsWithReport(slugs) {
  try {
    const orchestratorsPath = "./src/ochestrators";

    // Read all files in orchestrators directory
    const orchestratorFiles = await fs.readdir(orchestratorsPath);

    // Extract site names from orchestrator files
    const implementedSites = orchestratorFiles
      .filter((file) => file.endsWith("Oche.js"))
      .map((file) => file.replace("Oche.js", "").toLowerCase());

    if (implementedSites.length > 0 && slugs.length === 0) {
      const msg = `Validation Error: slugs.txt is empty, but ${implementedSites.length} orchestrator(s) found.`;
      logger(msg, "error");
      throw new Error(msg);
    }

    const validatedSlugs = [];
    const invalidSlugs = [];
    const slugCounts = {};
    const siteVariants = {};

    for (const slug of slugs) {
      const match = slug.match(/^(.+)-([a-z\.]+)$/i);

      if (!match) {
        invalidSlugs.push(slug);
        logger(
          `❌ Invalid slug format: '${slug}' — must match '<name>-<tld>'`,
          "warn"
        );
        continue;
      }

      const [_, siteNameRaw, tld] = match;
      const siteName = siteNameRaw.toLowerCase();

      // Validate TLD part
      const validTLDs = [
        "com",
        "nl",
        "org",
        "net",
        "co.uk",
        "de",
        "fr",
        "it",
        "es",
        "au",
        "ca",
        "jp",
        "br",
      ];

      if (!validTLDs.includes(tld.toLowerCase())) {
        invalidSlugs.push(slug);
        logger(
          `❌ Invalid TLD in slug: '${slug}' — unexpected suffix '-${tld}'`,
          "warn"
        );
        continue;
      }

      // Track site usage
      slugCounts[siteName] = (slugCounts[siteName] || 0) + 1;
      if (!siteVariants[siteName]) {
        siteVariants[siteName] = [];
      }
      siteVariants[siteName].push(slug);

      if (implementedSites.includes(siteName)) {
        validatedSlugs.push(slug);
      } else {
        invalidSlugs.push(slug);
      }
    }

    // Generate detailed report
    const report = {
      totalSlugs: slugs.length,
      validSlugs: validatedSlugs.length,
      invalidSlugs: invalidSlugs.length,
      implementedSites: implementedSites.length,
      duplicateSites: Object.entries(slugCounts)
        .filter(([_, count]) => count > 1)
        .map(([siteName, count]) => ({
          siteName,
          count,
          variants: siteVariants[siteName],
        })),
      missingOrchestrators: invalidSlugs.map((slug) => {
        const siteName = slug
          .replace(/-(com|nl|org|net|co\.uk|de|fr|it|es|au|ca|jp|br)$/i, "")
          .toLowerCase();
        return { slug, expectedFile: `${siteName}Oche.js` };
      }),
      unusedOrchestrators: implementedSites
        .filter((siteName) => !Object.keys(slugCounts).includes(siteName))
        .map((siteName) => `${siteName}Oche.js`),
    };

    // Log summary
    logger(`Validation Summary:`, "info");
    logger(`  Total slugs: ${report.totalSlugs}`, "info");
    logger(`  Valid slugs: ${report.validSlugs}`, "info");
    logger(`  Invalid slugs: ${report.invalidSlugs}`, "info");

    if (report.missingOrchestrators.length > 0) {
      logger(`  Missing orchestrators:`, "warn");
      report.missingOrchestrators.forEach(({ slug, expectedFile }) => {
        logger(`    - ${slug} → ${expectedFile}`, "warn");
      });
    }

    if (report.unusedOrchestrators.length > 0) {
      logger(
        `  Unused orchestrators: ${report.unusedOrchestrators.join(", ")}`,
        "warn"
      );
    }

    if (report.duplicateSites.length > 0) {
      logger(`  Sites with multiple variants:`, "info");
      report.duplicateSites.forEach(({ siteName, count, variants }) => {
        logger(
          `    - ${siteName}: ${count} variants (${variants.join(", ")})`,
          "info"
        );
      });
    }

    return {
      validSlugs: validatedSlugs,
      report,
    };
  } catch (error) {
    logger(`Error validating slugs: ${error.message}`, "error");
    return {
      validSlugs: slugs,
      report: { error: error.message },
    };
  }
}

export default async function loadSiteSlugs(req, res) {
  try {
    const supported_site_path = "src/data/slugs/slugs.txt";
    const slugs_text = await fs.readFile(supported_site_path, "utf-8");

    if (!req.locals?.user) {
      logger("Error: req.locals.user is undefined", "error");
      return res?.status(403).json({ error: "Unauthorized request" });
    }

    const { isAdmin, userId } = req.locals?.user;

    if (!isAdmin || !userId) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const rawSlugs = slugs_text
      .split(",")
      .map((slug) => slug.trim())
      .filter((slug) => slug.length > 0);

    const { validSlugs, report } = await validateImplementedSlugsWithReport(
      rawSlugs
    );

    return res.status(200).json({ slugs: validSlugs });
  } catch (error) {
    logger(`Error in loadSiteSlugs: ${error}`, "error");
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
