import { logger } from "../../loggers/logger.js";
function parseReviewDate(relativeDate) {
  if (relativeDate) {
    const processedRelativeDate = relativeDate.replace(/^an?\s+/i, "1 ");
    const match = processedRelativeDate.match(/(\d+)\s+(\w+)\s+ago/);

    if (match) {
      const [, value, unit] = match;
      const currentDate = new Date();
      switch (unit.toLowerCase()) {
        case "days":
        case "day":
          currentDate.setDate(currentDate.getDate() - parseInt(value));
          break;
        case "weeks":
        case "week":
          currentDate.setDate(currentDate.getDate() - parseInt(value) * 7);
          break;
        case "months":
        case "month":
          currentDate.setMonth(currentDate.getMonth() - parseInt(value));
          break;
        case "years":
        case "year":
          currentDate.setFullYear(currentDate.getFullYear() - parseInt(value));
          break;
        case "hours":
        case "hour":
          currentDate.setHours(currentDate.getHours() - parseInt(value));
          break;
        case "minutes":
        case "minute":
          currentDate.setMinutes(currentDate.getMinutes() - parseInt(value));
          break;
        case "seconds":
        case "second":
          currentDate.setSeconds(currentDate.getSeconds() - parseInt(value));
          break;
        default:
          return null;
      }

      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, "0");
      const day = String(currentDate.getDate()).padStart(2, "0");
      const mainoutput = `${year}-${month}-${day}`;

      return mainoutput;
    }
  }

  return relativeDate || null;
}
function parsePropertyResponse($, element) {
  const propertyResponseSection = $(element).find("div.n7uVJf");
  const paragraphs = propertyResponseSection.find("p.JOzlvd");

  const responseLines = [];

  paragraphs.each((_, p) => {
    const line = $(p).text().trim();
    if (line) responseLines.push(line);
  });

  return responseLines.length ? responseLines.join("\n") : null;
}
function processResponseDate($, element) {
  const responseContainer = $(element).find(".n7uVJf").first();
  const spans = responseContainer.find("span");

  if (spans.length > 1) {
    return $(spans[1]).text().trim() || null;
  }
  return null;
}
function parseSubratings($, element) {
  const subratingsContainer = $(element).find(".X4nL7d").first();
  const subratings = {};

  subratingsContainer.find(".dA5Vzb").each((_, el) => {
    const category = $(el).find("span.uTU5Ac").text().trim();
    const rating = $(el).find("span").last().text().trim();

    if (category && rating) {
      subratings[category] = rating;
    }
  });

  if (Object.keys(subratings).length === 0) return [];

  const subratingsList = [];
  for (const [key, value] of Object.entries(subratings)) {
    subratingsList.push({ key, value });
  }

  return subratingsList;
}
function parseExtras(
  $,
  element,
  expectedKeys = [
    "Rooms",
    "Walkability",
    "Food & drinks",
    "Hotel highlights",
    "Service",
    "Location",
    "Cleanliness",
    "Value for money",
  ]
) {
  const extrasContainer = $(element).find(".X4nL7d");
  const extras = {};

  extrasContainer.children("div").each((_, div) => {
    let label = "";
    let description = "";

    const firstSpan = $(div).find("span").first();
    if (firstSpan.hasClass("Iw4tIc") || firstSpan.hasClass("iTppcd")) {
      label = firstSpan.text().trim();
      description = $(div).find("span").last().text().trim();
    } else {
      const spans = $(div).find("span");
      if (spans.length === 2) {
        const firstSpanText = spans.first().text().trim();

        const matchedKey = expectedKeys.find(
          (key) =>
            firstSpanText === key ||
            firstSpanText === key.replace(/&/g, "&amp;") ||
            key.replace(/&/g, "&amp;") === firstSpanText
        );

        if (matchedKey) {
          label = firstSpanText;
          description = spans.last().text().trim();
        }
      }
    }

    if (label && description && !/^\d+\.\d+$/.test(description)) {
      extras[label] = description;
    }
  });

  return Object.keys(extras).length > 0 ? extras : null;
}
function extractUserIdFromUrl(url) {
  const match = url.match(/contrib\/([^/?]+)/);
  return match ? match[1] : null;
}
function extractPreferredBodyText(reviewText) {
  if (!reviewText || typeof reviewText !== "string") return "";

  if (reviewText.includes("(Original)")) {
    // Find the exact position of "(Original)"
    const originalPos = reviewText.indexOf("(Original)");

    if (originalPos >= 0) {
      // Get everything after "(Original)"
      let afterOriginal = reviewText.substring(originalPos + 10);

      // Make sure we have text
      if (afterOriginal) {
        return afterOriginal.trim();
      }
    }
  }

  // In case the text pattern has changed
  if (reviewText.includes("(original)")) {
    const originalPos = reviewText.indexOf("(original)");
    if (originalPos >= 0) {
      return reviewText.substring(originalPos + 10).trim();
    }
  }

  return reviewText.trim();
}
function validateObjectFields(obj) {
  if (!obj) return null;
  const isValid = Object.values(obj).every(
    (value) => value !== null && value !== ""
  );
  return isValid ? obj : null;
}
function parseReviewExtraDetails($, element) {
  try {
    const result = {};

    const highlightsEl = $(element).find(".iTppcd");
    if (highlightsEl.length > 0 && highlightsEl.text() === "Hotel highlights") {
      const highlightsText = highlightsEl
        .next()
        .text()
        .replace("…Read more", "")
        .trim();
      if (highlightsText) {
        result["Hotel highlights"] = highlightsText;
      }
    }

    const sections = $(element).find(".NkS78 > div");
    sections.each((_, section) => {
      const $section = $(section);
      const titleEl = $section.find(".Iw4tIc");
      const contentEl = titleEl.next();

      if (titleEl.length > 0 && contentEl.length > 0) {
        const title = titleEl.text().trim();
        const content = contentEl.text().trim();

        if (title && content) {
          result[title] = content;
        }
      }
    });

    return Object.keys(result).length === 0 ? null : result;
  } catch (error) {
    logger(`Error in parseReviewExtraDetails: ${error}`, "error");
  }
}
export default async function parseGoogleReview($) {
  try {
    let reviews = [];

    $(".Svr5cf.bKhjM[data-hveid]").each((index, element) => {
      const username =
        $(element).find('span.k5TI0 a[target="_blank"]').text().trim() ||
        "Anonymous";
      const siteSlug = "google-com";
      const authorProfileUrl = $(element)
        .find('span.k5TI0 a[target="_blank"]')
        .attr("href");

      const bodyString =
        $(element).find("div.K7oBsc").text().trim() ||
        $("div.K7oBsc div span").text().trim() ||
        "Guest did not provide details";

      const revieBody = bodyString && extractPreferredBodyText(bodyString);
      const cleanReviewBody =
        revieBody.replace(/^[\s\S]*?\(original\)/i, "").trim() || null;

      const responseString = parsePropertyResponse($, element);
      const cleanedResponseBody =
        (responseString && extractPreferredBodyText(responseString)) || null;

      const authorExternalId = extractUserIdFromUrl(authorProfileUrl);
      const reviewDateString = $(element)
        .find("span.k5TI0 span.iUtr1")
        .text()
        .trim();

      const formatedReviewDate = parseReviewDate(reviewDateString);

      const resDate = processResponseDate($, element);
      const formatedResDate = resDate && parseReviewDate(resDate);

      const responseObject = validateObjectFields({
        body: cleanedResponseBody,
        responseDate: formatedResDate,
      });

      const rating = $(element)
        .find("div.GDWaad")
        .text()
        .replace("/5", "")
        .trim();

      const tripType = $(element).find("div.ThUm5b span").text().trim() || null;
      const subratings = parseSubratings($, element);

      const reviewExtras1 = parseExtras($, element);
      // const reviewExtras2 = parseReviewExtraDetails($, element);
      const extras = reviewExtras1; // || reviewExtras2;

      const formattedExtras = extras
        ? Object.entries(extras)
            .map(([key, value]) => `<br>- ${key}: ${value}\n`)
            .join("\n")
        : "";

      const enrichedReviewBody = `${cleanReviewBody}<br>${formattedExtras}`;

      const commonReviewProperties = {
        author: username,
        authorProfileUrl,
        rating,
        tripType,
        authorExternalId,
        reviewSiteSlug: siteSlug,
        reviewBody: enrichedReviewBody,
        reviewDate: formatedReviewDate,
        subratings: subratings,
        miscellaneous: extras,
        propertyResponse: responseObject,
      };

      reviews = {
        ...commonReviewProperties,
      };
    });

    return reviews;
  } catch (e) {
    logger(`${e}: from <parseGoogleReview> function`, "error");
    return [];
  }
}
