import { USER_MODEL } from "../src/models/user.js";

export default async function isSubscribed(req, res, next) {
  try {
    const user = req.locals?.user;

    if (!user || user.isSubscribed !== true) {
      const errorMsg = "Active subscription is required!";
      console.error(`> Access denied: ${errorMsg}`);
      return res
        .status(403)
        .json({ error: "Subscription required to access this resource." });
    }

    next();
  } catch (error) {
    console.error("> Middleware error:", error);
    return res
      .status(500)
      .json({ error: "Internal server error in subscription check." });
  }
}

export async function userIsSuper(req, res, next) {
  try {
    const superToken = req?.locals?.user?.superUserToken;

    if (!superToken) {
      return res
        .status(401)
        .json({ error: "Unauthorized to view this resource." });
    }

    const isSuperUser = await USER_MODEL.isSuperUser(superToken);
    if (!isSuperUser) {
      return res.status(401).json({ error: "Unauthorized!!!!!!!!!!!." });
    }
    next();
  } catch (error) {
    console.log(`Error in userIsSuperUser middleware: ${error.message}`);
    if (res) {
      return res.status(500).json({ error: error.message });
    }
    throw error;
  }
}
