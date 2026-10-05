import { z } from "zod";
import { infrai } from "./infrai.js";

export const orderUpdate = z.object({
  orderId: z.string().min(1),
  buyerEmail: z.string().email(),
  buyerPhone: z.string().min(7),
  sellerName: z.string().min(1),
  status: z.enum(["confirmed", "shipped", "ready_for_pickup"])
});

export type OrderUpdate = z.infer<typeof orderUpdate>;

export async function handoffOrder(input: unknown) {
  const order = orderUpdate.parse(input);
  const suppression = await infrai.email.suppression.check(order.buyerEmail);
  if (suppression.suppressed) return { sent: false as const, reason: "buyer_opted_out" as const, orderId: order.orderId };

  const sent = await infrai.sms.batch.send(
    [{ to: order.buyerPhone, body: `${order.sellerName}: order ${order.orderId} is ${order.status}.` }],
    `order-${order.orderId}-${order.status}`
  );
  return { sent: true as const, orderId: order.orderId, messageId: sent.message_id, status: order.status };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const raw = process.env.ORDER_UPDATE_JSON;
  if (!raw) throw new Error("ORDER_UPDATE_JSON is required");
  console.log(await handoffOrder(JSON.parse(raw)));
}
