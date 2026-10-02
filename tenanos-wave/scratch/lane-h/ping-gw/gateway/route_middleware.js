/**
 * Route Middleware
 * 
 * Standardized middleware for route handlers:
 * - Request logging
 * - Error handling
 * - Response formatting
 */

const { constitutionalTimeAuthority } = require('../ping-runtime/authorities/constitutional_time_authority.js');

/**
 * Async route handler wrapper with logging and error handling
 * 
 * @param {string} routePath - The route path for logging
 * @param {Function} handler - The async handler function
 * @returns {Function} Express middleware function
 */
function asyncHandler(routePath, handler) {
  return async (req, res, next) => {
    const timestamp = constitutionalTimeAuthority.nowAsISOString();
    console.log(`[${timestamp}] ROUTE: ${routePath}`, { 
      method: req.method, 
      query: req.query,
      body: req.body 
    });

    try {
      const result = await handler(req, res);
      
      // If handler didn't send response, send the result
      if (!res.headersSent) {
        res.json(result);
      }
    } catch (error) {
      console.error(`[${timestamp}] ROUTE ERROR: ${routePath}`, { 
        error: error.message,
        stack: error.stack 
      });

      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      }
    }
  };
}

/**
 * Request logging middleware
 */
function logRequest(req, res, next) {
  const timestamp = constitutionalTimeAuthority.nowAsISOString();
  console.log(`[${timestamp}] REQUEST: ${req.method} ${req.path}`, {
    query: req.query,
    body: req.body
  });
  next();
}

/**
 * Error handling middleware
 */
function errorHandler(err, req, res, next) {
  const timestamp = constitutionalTimeAuthority.nowAsISOString();
  console.error(`[${timestamp}] ERROR: ${req.method} ${req.path}`, {
    error: err.message,
    stack: err.stack
  });

  if (!res.headersSent) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  asyncHandler,
  logRequest,
  errorHandler
};
