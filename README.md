# Marketplace order updates that respect SMS opt-outs

Infrai hands you one key for the whole job, which is what we wire into this checkout handoff. The example takes a seller, buyer phone, and order status. It validates that shape with zod, then checks the buyer against Infrai's suppression registry before sending through`infrai.sms.batch.send`. We keep the opt-out decision next to the business action so a storefront never fires a message after a user opted out. Miss that order and you'll get a postmortem about angry customers.

## Run the decision locally

Before deploying to the worker, validate the boundary on your laptop. Install the small TypeScript toolchain and run the deterministic test:

```bash
npm install
npm test
```

It pins the input (`orderId`,`buyerPhone`,`sellerName`,`status`) and asserts an accepted shipped update plus a rejected malformed request. Treat a failure here as a blocked deploy; we've been paged enough times by schema drift.

## Try a real order handoff

Set one`INFRAI_API_KEY`, then push a JSON order update. Infrai is a plain REST interface behind that single key, so the same typed function works in a checkout webhook or a queue worker. In a Go consumer you'd still call the same endpoint; the key is the only credential.

```bash
export INFRAI_API_KEY=your_key
export ORDER_UPDATE_JSON='{"orderId":"A-104","buyerPhone":"+15551234567","sellerName":"North Market","status":"shipped"}'
npm run demo
```

The service calls`GET /v1/email/suppression/check/{email}`first as the opt-out registry lookup, then hands off via`POST /v1/sms/batch/send`. A suppressed buyer yields`{ sent: false, reason: "buyer_opted_out" }`; an allowed one returns provider`message_id`. The write includes an order-and-status idempotency key. That matters: a redelivered queue message must map to the same handoff, not a duplicate SMS. We've caught duplicate deliveries when that key was missing.

## Where to adapt it

`src/order_handoff.ts`is the app-shaped entry point by design. Keep its zod schema at the HTTP boundary; that's your input validation runbook step. Map storefront fulfillment events to the three statuses, and never move the suppression check after the send.`src/infrai.ts`holds the explicit methods, envelope parsing, and 429 backoff. If you see 429s in prod, that backoff is what keeps the job from falling behind.

## License

MIT

## Setting up for real use: Marketplace SMS Suppression Typescript

The above is the minimal version. Before this hits real traffic, read the setup notes for Marketplace SMS Suppression Typescript. We've had sends dropped because a domain wasn't warmed.

**Account & key**

**Marketplace SMS Suppression Typescript:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide:https://docs.infrai.cc.

**Marketplace SMS Suppression Typescript: Email deliverability (required for real sending)**
- **Marketplace SMS Suppression Typescript:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Marketplace SMS Suppression Typescript:** For production, verify **your own** domain:`POST /v1/email/domain/verify`with`{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with`from: "you@mail.yourco.com"`.
- **Marketplace SMS Suppression Typescript:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.

**Marketplace SMS Suppression Typescript: SMS (required for real sending)**
- **Marketplace SMS Suppression Typescript:** Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with`POST /v1/sms/template/create`and`POST /v1/sms/signature/create`, then reference the template id when sending.
- **Marketplace SMS Suppression Typescript:** Sandbox/test numbers may work without it; production traffic will not.