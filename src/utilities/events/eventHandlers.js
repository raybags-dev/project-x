import bindToContext from "../../../middleware/generalHandlers.js";
import { holdOnFor } from "../utilities.js";

const utilityRegistry = {
  // ***** GOOGLE.COM *****
  waitForGoogleReviewXHR: async function (page, timeout = 3000) {
    return page.waitForResponse(
      (response) =>
        response
          .url()
          .startsWith(
            "https://www.google.com/_/TravelFrontendUi/data/batchexecute"
          ) &&
        response.request().method() === "POST" &&
        response.status() === 200,
      { timeout }
    );
  },
  handleGoogleCookieDialogue: async function (page) {
    const cookieDismissed = await page.evaluate(() => {
      try {
        const cookieSpan = Array.from(document.querySelectorAll("span")).find(
          (el) =>
            el.textContent.trim().toLowerCase() === "accept all" &&
            el.getAttribute("jsname") === "V67aGc" &&
            el.offsetParent !== null
        );
        if (cookieSpan) {
          cookieSpan.click();
          return true;
        }
        return false;
      } catch (err) {
        console.log(`Cookie dialog error: ${err}`);
        return false;
      }
    });
    if (cookieDismissed) {
      console.log("✅ Cookie dialog dismissed.");
      await holdOnFor(5000);
      return cookieDismissed;
    }
  },
  handleGoogleReviewTabBtn: async function (page) {
    if (!page) throw new Error("web page objects is null or undeflined");

    const reviewsButtonClicked = await page.evaluate(() => {
      const reviewTab = document.querySelector(
        'div[aria-label="Reviews"][id="reviews"][role="tab"]'
      );
      if (reviewTab) {
        reviewTab.click();
        return true;
      }
      return false;
    });

    if (!reviewsButtonClicked) throw new Error('"Review Tab" button not found');
    console.log('✅ Clicked "Reviews" button');
  },
  handleGoogleReviewFIlterSelection: async function (page) {
    if (!page) throw new Error("web page objects is null or undeflined");

    const allReviewsClicked = await page.evaluate(async () => {
      try {
        const elements = Array.from(
          document.querySelectorAll("span, button, a, div")
        );

        const targets = elements.filter(
          (el) => el.textContent.trim() === "All reviews"
        );

        if (targets.length >= 2) {
          targets[1].click();
        } else if (targets.length === 1) {
          targets[0].click();
        } else {
          return false;
        }

        await new Promise((res) => setTimeout(res, 2000));

        const googleOption = Array.from(
          document.querySelectorAll('[role="option"][aria-label="Google"]')
        ).find((el) => el.offsetParent !== null);

        if (googleOption) {
          googleOption.click();
          return true;
        }

        return false;
      } catch (e) {
        console.warn(`Error clicking All reviews or Google button: ${e}`);
        return false;
      }
    });
    if (!allReviewsClicked)
      throw new Error('"All reviews Tab" trigger not found');
    console.log('✅ Clicked "All reviews" button');
  },
  handleRecentReviewFIlterSelection: async function (page) {
    if (!page) throw new Error("web page objects is null or undeflined");

    const mostRecentClicked = await page.evaluate(async () => {
      try {
        const sortDropdownTrigger = Array.from(
          document.querySelectorAll(
            '[aria-label="Review Sort Options"] [jsname="LgbsSe"]'
          )
        ).find((el) => el.offsetParent !== null);

        if (!sortDropdownTrigger) return false;

        sortDropdownTrigger.click();

        await new Promise((res) => setTimeout(res, 2000));

        const mostRecentOption = Array.from(
          document.querySelectorAll('[role="option"][aria-label="Most recent"]')
        ).find((el) => el.offsetParent !== null);

        if (mostRecentOption) {
          mostRecentOption.click();
          return true;
        }

        return false;
      } catch (e) {
        console.error(`Error clicking Most helpful or Most recent: ${e}`);
        return false;
      }
    });

    if (!mostRecentClicked) throw new Error('"Most recent" option not found');

    console.log('(dropdown triggered) selected "Most recent"');
  },
  // ***** GOOGLE.COM *****
};

bindToContext(utilityRegistry);
export default utilityRegistry;
