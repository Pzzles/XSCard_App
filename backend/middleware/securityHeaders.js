/**
 * Middleware to add security headers to all responses
 */
const securityHeaders = (req, res, next) => {
  // Fix for the missing Referrer-Policy header
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Additional recommended security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  
  // Continue to the next middleware
  next();
};

module.exports = securityHeaders;
