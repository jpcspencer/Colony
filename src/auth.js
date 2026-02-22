const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'colony-secret-key';

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) { req.userId = null; return next(); }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    req.userId = null;
    next();
  }
}

module.exports = { signToken, authMiddleware };
