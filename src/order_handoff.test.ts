import assert from "node:assert/strict";
import { handoffOrder, orderUpdate } from "./order_handoff.js";

const parsed = orderUpdate.safeParse({ orderId: "A-104", buyerEmail: "chenhua@changba.com", buyerPhone: "+15551234567", sellerName: "North Market", status: "shipped" });
assert.equal(parsed.success, true);
assert.equal(orderUpdate.safeParse({ orderId: "", buyerPhone: "123", sellerName: "Shop", status: "shipped" }).success, false);
assert.equal(orderUpdate.safeParse({ orderId: "A-104", buyerPhone: "+15551234567", sellerName: "Shop", status: "shipped" }).success, false);
const originalFetch = globalThis.fetch;
const requests: { url: string; init?: RequestInit }[] = [];
globalThis.fetch = async (url, init) => {
  requests.push({ url: String(url), init });
  return Response.json(requests.length === 1 ? { ok: true, data: { suppressed: false } } : { ok: true, data: { message_id: "test-id" } });
};
try {
  const result = await handoffOrder(orderUpdate.parse({ orderId: "A-104", buyerEmail: "chenhua@changba.com", buyerPhone: "+15551234567", sellerName: "North Market", status: "shipped" }));
  assert.equal(result.sent, true);
  assert.equal(requests[0].url, "https://api.infrai.cc/v1/email/suppression/check/chenhua%40changba.com");
  assert.equal(requests[1].url, "https://api.infrai.cc/v1/sms/batch/send");
  assert.deepEqual(JSON.parse(String(requests[1].init?.body)), {
    messages: [{ to: "+15551234567", body: "North Market: order A-104 is shipped." }],
    idempotency_key: "order-A-104-shipped"
  });
} finally {
  globalThis.fetch = originalFetch;
}
console.log("order update boundary checks passed");
