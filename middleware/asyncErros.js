export function asyncMiddleware(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (ex) {
      if (
        ex instanceof TypeError &&
        ex.message &&
        ex.message.includes("Cannot read properties of null")
      ) {
        const statusCode = 500;
        if (!res.headersSent) {
          res.status(statusCode).json({
            status: "TypeError - null property access",
            message:
              "Attempted to read a property of a null object. Please check your data and ensure all required fields are present.",
          });
        }
        // Log the error details
        console.error("TypeError details:", ex.message);
        console.error("Stack Trace:", ex.stack);
      }

      if (ex.message.includes("TypeError: browser.close is not a function")) {
        res.status(500).json({
          status: "__________Invalid Browser Instance___________",
          message:
            "It seems that the browser instance is not valid or has already been closed. Please ensure that the browser is properly initialized and not closed before this operation.",
        });
      }

      // Handle specific CastError
      if (ex.name === "CastError") {
        const statusCode = 400;
        if (!res.headersSent) {
          return res.status(statusCode).json({
            status: "mongo-error",
            message: "Invalid document ID format",
          });
        }
      }

      // General error handling for other types of errors
      const statusCode = ex.statusCode || 500;
      if (!res.headersSent)
        res
          .status(statusCode)
          .json({ status: "async-error - failed", message: ex.message });

      // Log general error message
      console.error("Error message:", ex.message);
      console.error("Stack Trace:", ex.stack);

      // Pass error to the next middleware if necessary
      if (typeof next === "function") {
        next({ error: "Something went wrong!\n", message: ex });
      }
    }
  };
}
export function handleStandardErrors(fn) {
  return async function (...args) {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(
        `Error in function ${fn.name || "anonymous"}: ${error.message}`
      );
      return null;
    }
  };
}
