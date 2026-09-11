'use strict';

const jwt = require('jsonwebtoken');

/**
 * Establishes who is on the other end of a socket.
 *
 * Identification used to be whatever id the client sent, which was harmless
 * while sockets only drew map markers. Now that a socket can claim a delivery,
 * a spoofed id is a driver stealing another driver's work -- so the id comes
 * from the signed token or not at all.
 */

// Without the secret every token fails to verify and every socket ends up
// anonymous -- which looks exactly like "drivers never get offers". Say so once,
// loudly, at startup rather than leaving it to be diagnosed from silence.
if (!process.env.JWT_SECRET) {
  console.error(
    '[socket] JWT_SECRET is not set. No socket will be able to identify, so no ' +
      'driver will receive delivery offers. Set it to the same value the ' +
      'authentication service signs with.',
  );
}

const ROLE_ALIASES = {
  DELIVERY_PERSON: 'driver',
  driver: 'driver',
  CUSTOMER: 'customer',
  customer: 'customer',
};

/** Our two socket-facing roles, from whichever vocabulary the token uses. */
const normalizeRole = (role) => ROLE_ALIASES[role] || null;

/** The bearer token, from either the socket.io auth field or the header. */
function readToken(socket) {
  const fromAuth = socket.handshake?.auth?.token;
  const fromHeader = socket.handshake?.headers?.authorization;
  const raw = fromAuth || fromHeader;

  if (!raw || typeof raw !== 'string') return null;
  return raw.startsWith('Bearer ') ? raw.slice(7).trim() : raw.trim();
}

/**
 * Attaches the verified identity to `socket.data.user`, when there is one.
 *
 * Connections without a valid token are still allowed through: the map view is
 * public and renders for signed-out visitors. They simply never get an
 * identity, so `identify` and every dispatch event will refuse them.
 */
function socketAuth(socket, next) {
  const token = readToken(socket);

  if (!token) {
    socket.data.user = null;
    return next();
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const role = normalizeRole(payload.role);

    socket.data.user = {
      id: String(payload.id || payload._id),
      role,
      rawRole: payload.role,
      email: payload.email,
    };
  } catch (error) {
    console.warn('[socket] rejected token:', error.message);
    socket.data.user = null;
  }

  return next();
}

module.exports = { socketAuth, normalizeRole };
