/** UI-only clock anchored when a current cloud read is received.
 * Network/lock time before that response is never deducted a second time.
 * The RPC still decides whether an undo is within its real server deadline.
 */
export function createServerClock(serverNow, receivedAt) {
  return {serverMilliseconds: Date.parse(serverNow), receivedAt};
}
export function serverTimeAt(anchor, monotonicNow) {
  return anchor.serverMilliseconds + Math.max(0, monotonicNow - anchor.receivedAt);
}
export function remainingServerSeconds(until, anchor, monotonicNow) {
  return Math.max(0, Math.ceil((Date.parse(until) - serverTimeAt(anchor, monotonicNow)) / 1000));
}
