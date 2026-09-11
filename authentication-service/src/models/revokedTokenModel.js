const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Tokens that have been logged out.
 *
 * A JWT stays valid for its whole lifetime no matter what the browser throws
 * away, so a logout that only clears localStorage does not actually end the
 * session -- anyone holding a copy of the token keeps full access until it
 * expires. This collection is the server's memory of "that one is dead".
 *
 * We store a SHA-256 of the token rather than the token itself: enough to
 * recognise it on a later request, useless to anyone who reads the collection.
 *
 * expiresAt carries the token's own `exp` claim, and the TTL index drops the
 * row once the token would have expired on its own, so the collection never
 * grows past roughly "logouts within one JWT_EXPIRES_IN".
 */
const RevokedTokenSchema = new mongoose.Schema({
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String
  },
  expiresAt: {
    type: Date,
    required: true,
    expires: 0
  }
}, { timestamps: true });

/** Both services must hash identically, or a revoked token looks unrevoked. */
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const RevokedToken =
  mongoose.models.RevokedToken || mongoose.model('RevokedToken', RevokedTokenSchema);

module.exports = { RevokedToken, hashToken };
