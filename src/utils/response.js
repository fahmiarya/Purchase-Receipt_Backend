// src/utils/response.js
/**
 * Helper functions to format API responses according to the specification in REQUIREMENTS.md.
 * All successful responses have the shape:
 *   { "success": true, "data": <payload>, "message": <optional string> }
 * All error responses have the shape:
 *   { "success": false, "error": <error message>, "details": <optional object> }
 */

function success(data, message = null) {
  const resp = { success: true, data };
  if (message) resp.message = message;
  return resp;
}

function created(data, message = null) {
  // 201 Created – same shape as success
  return success(data, message);
}

function ok(data, message = null) {
  // 200 OK – same shape as success
  return success(data, message);
}

function noContent() {
  return { success: true, data: null, message: 'No Content' };
}

function errorResponse(errorMsg, details = null) {
  const resp = { success: false, error: errorMsg };
  if (details) resp.details = details;
  return resp;
}

module.exports = { success, created, ok, noContent, errorResponse };
