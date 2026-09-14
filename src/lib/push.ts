import { prisma } from "./prisma";
import { sendPush, apnsConfigured, type PushMessage } from "./apns";

export { apnsConfigured };

/**
 * Sends a push to every device a user has registered.
 *
 * Tokens APNs reports as dead are deleted rather than retried — an uninstalled
 * app leaves a token that would otherwise fail on every send forever.
 */
export async function notifyUser(userId: string, message: PushMessage): Promise<number> {
  if (!apnsConfigured()) return 0;

  const rows = await prisma.deviceToken.findMany({ where: { userId }, select: { token: true } });
  if (rows.length === 0) return 0;

  const results = await sendPush(rows.map((r) => r.token), message);

  const dead = results.filter((r) => r.shouldDelete).map((r) => r.token);
  if (dead.length > 0) {
    await prisma.deviceToken.deleteMany({ where: { token: { in: dead } } });
  }

  return results.filter((r) => r.ok).length;
}
