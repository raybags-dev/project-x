export function healthController(options) {
  return withAuthorization((req, res) => {
    try {
      const memoryUsage = process.memoryUsage();
      const healthData = {
        status: "healthy",
        instance: options.INSTANCE_ID,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: formatMemory(memoryUsage),
        pid: process.pid,
        automation: options.RUN_AUTOMATION,
      };

      res.status(200).json(healthData);
    } catch (error) {
      res.status(500).json({
        status: "unhealthy",
        instance: options.INSTANCE_ID,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });
}
export function instanceInfoController(options) {
  return withAuthorization((req, res) => {
    try {
      const isAuthorized = checkAuth(req, res);
      if (!isAuthorized) return;

      const memoryUsage = process.memoryUsage();
      const instanceInfo = {
        instance: options.INSTANCE_ID,
        port: process.env.PORT || 3001,
        automation: options.RUN_AUTOMATION,
        pid: process.pid,
        uptime: process.uptime(),
        memory: formatMemory(memoryUsage),
        environment: process.env.NODE_ENV || "development",
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        timestamp: new Date().toISOString(),
        startTime: new Date(Date.now() - process.uptime() * 1000).toISOString(),
      };

      res.status(200).json(instanceInfo);
    } catch (error) {
      res.status(500).json({
        error: "Failed to get instance information",
        instance: options.INSTANCE_ID,
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });
}
export function loadBalancerStatusController(options) {
  return withAuthorization((req, res) => {
    try {
      const isAuthorized = checkAuth(req, res);
      if (!isAuthorized) return;

      const lbStatus = {
        currentInstance: options.INSTANCE_ID,
        loadBalancer: {
          status: "active",
          algorithm: "least_conn",
          totalInstances: 4,
          expectedInstances: ["1", "2", "3", "4"],
        },
        instanceDetails: {
          id: options.INSTANCE_ID,
          automation: options.RUN_AUTOMATION,
          uptime: process.uptime(),
          memory:
            Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) /
            100,
        },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(lbStatus);
    } catch (error) {
      res.status(500).json({
        error: "Failed to get load balancer status",
        instance: options.INSTANCE_ID,
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });
}
export function isInstanceReadyCheckController(options) {
  return withAuthorization((req, res) => {
    try {
      const isAuthorized = checkAuth(req, res);
      if (!isAuthorized) return;

      const isReady = true;

      if (isReady) {
        res.status(200).json({
          status: "ready",
          instance: options.INSTANCE_ID,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(503).json({
          status: "not ready",
          instance: options.INSTANCE_ID,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      res.status(503).json({
        status: "not ready",
        instance: options.INSTANCE_ID,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });
}
export function metricsController(options) {
  return withAuthorization((req, res) => {
    try {
      const isAuthorized = checkAuth(req, res);
      if (!isAuthorized) return;

      const memoryUsage = process.memoryUsage();
      const metrics = {
        instance: options.INSTANCE_ID,
        uptime_seconds: Math.floor(process.uptime()),
        memory_usage_mb:
          Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
        memory_total_mb:
          Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
        memory_rss_mb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
        process_id: process.pid,
        automation_enabled: options.RUN_AUTOMATION ? 1 : 0,
        timestamp: Date.now(),
      };

      // Prometheus-style format
      if (req.query.format === "prometheus") {
        let prometheusMetrics = "";
        Object.entries(metrics).forEach(([key, value]) => {
          if (typeof value === "number") {
            prometheusMetrics += `reviewer_x_${key}{instance="${options.INSTANCE_ID}"} ${value}\n`;
          }
        });
        res.setHeader("Content-Type", "text/plain");
        res.send(prometheusMetrics);
      } else {
        res.status(200).json(metrics);
      }
    } catch (error) {
      res.status(500).json({
        error: "Failed to get metrics",
        instance: options.INSTANCE_ID,
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  });
}
function withAuthorization(handler) {
  return function (req, res) {
    const isAuthorized = checkAuth(req, res);
    if (!isAuthorized) return;
    return handler(req, res);
  };
}
function checkAuth(req, res) {
  const superToken = req?.locals?.user?.superUserToken;
  if (!superToken) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}
function formatMemory(memoryUsage) {
  return {
    rss: +(memoryUsage.rss / 1024 / 1024).toFixed(2),
    heapTotal: +(memoryUsage.heapTotal / 1024 / 1024).toFixed(2),
    heapUsed: +(memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
    external: +(memoryUsage.external / 1024 / 1024).toFixed(2),
  };
}
