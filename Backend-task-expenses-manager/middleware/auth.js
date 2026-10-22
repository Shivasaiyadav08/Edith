import { fromNodeHeaders } from "better-auth/node";
import { fail } from "../lib/validation.js";

// Never trust a caller-supplied identity header. Express resolves the socket/proxy IP.
export const attachClientIP = (req, res, next) => {
  req.headers['x-edith-client-ip'] = req.ip || req.socket.remoteAddress;
  next();
};

export const requireAuth = (auth) => async (req, res, next) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!session) fail(401, "Your session has expired. Please sign in again.");
  req.user = session.user;
  next();
};
