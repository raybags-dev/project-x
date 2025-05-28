import { asyncMiddleware } from "../../middleware/asyncErros.js";
import { authMiddleware } from "../../middleware/auth.js";
import isSubscribed, { userIsSuper } from "../../middleware/generalUtils.js";

import { authRateLimiter } from "../../middleware/limiters.js";

import {
  healthController,
  instanceInfoController,
  isInstanceReadyCheckController,
  loadBalancerStatusController,
  metricsController,
} from "../../nginxControllers/Controllers.js";

/**
 * Nginx and Load Balancer Related Routes Handler
 * Handles health checks, instance information, and load balancer specific endpoints
 */

export default function nginxRoutesHandler(app, instanceId, runAutomation) {
  const INSTANCE_ID = process.env.INSTANCE_ID || "1";
  const RUN_AUTOMATION = runAutomation || false;
  const options = { INSTANCE_ID, RUN_AUTOMATION };

  // Health check endpoint for load balancer
  app.get(
    "/health",
    authRateLimiter,
    authMiddleware,
    isSubscribed,
    userIsSuper,
    asyncMiddleware(healthController(options))
  );
  // Detailed instance information endpoint
  app.get(
    "/instance",
    authRateLimiter,
    authMiddleware,
    isSubscribed,
    userIsSuper,
    asyncMiddleware(instanceInfoController(options))
  );
  // Load balancer status endpoint (shows all instances from perspective of current instance)
  app.get(
    "/lb-status",
    authRateLimiter,
    authMiddleware,
    isSubscribed,
    userIsSuper,
    asyncMiddleware(loadBalancerStatusController(options))
  );
  // Ready endpoint ( indicates if instance is ready to receive traffic)
  app.get(
    "/ready",
    authRateLimiter,
    authMiddleware,
    isSubscribed,
    userIsSuper,
    asyncMiddleware(isInstanceReadyCheckController(options))
  );
  // Metrics endpoint for monitoring
  app.get(
    "/metrics",
    authRateLimiter,
    authMiddleware,
    isSubscribed,
    userIsSuper,
    asyncMiddleware(metricsController(options))
  );

  console.log(`Nginx routes handler initialized for instance ${INSTANCE_ID}`);
}
