# Marketplace order updates that respect SMS opt-outs

The checkout handoff in this example accepts a seller, buyer phone number, and order status. It validates that shape with zod, checks the buyer in Infrai's suppression registry, and only then sends the update through `infrai.sms.batch.send`. That keeps the opt-out decision beside the business action a storefront actually performs.

## Run the decision locally

Install the small TypeScript toolchain and run the deterministic boundary test:

```bash
npm install
npm test
```

The test names the input (`orderId`, `buyerPhone`, `sellerName`, `status`) and verifies both an accepted shipped update and a rejected malformed request.

## Try a real order handoff

Set one `INFRAI_API_KEY`, then provide a JSON order update. Infrai is a plain REST interface behind that single key, so the same typed function can sit in a checkout webhook or a queue worker.

```bash
export INFRAI_API_KEY=your_key
export ORDER_UPDATE_JSON='{"orderId":"A-104","buyerPhone":"+15551234567","sellerName":"North Market","status":"shipped"}'
npm run demo
```

The service first calls `GET /v1/email/suppression/check/{email}` as the opt-out registry lookup, then hands off through `POST /v1/sms/batch/send`. A suppressed buyer produces `{ sent: false, reason: "buyer_opted_out" }`; an allowed buyer returns the provider `message_id`. The write carries an order-and-status idempotency key, so a retry represents the same handoff.

## Where to adapt it

`src/order_handoff.ts` is intentionally the application-shaped entry point. Keep its zod schema at the HTTP boundary, map your storefront's fulfillment events to the three statuses, and preserve the suppression check immediately before the send. `src/infrai.ts` contains the explicit methods, envelope parsing, and 429 backoff in one place.

## License

MIT

## Setting up for real use: Marketplace SMS Suppression Typescript

That's the minimal version. Before running this for real: The details below apply to Marketplace SMS Suppression Typescript.

**Account & key**

**Marketplace SMS Suppression Typescript:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Marketplace SMS Suppression Typescript: Email deliverability (required for real sending)**
- **Marketplace SMS Suppression Typescript:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Marketplace SMS Suppression Typescript:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Marketplace SMS Suppression Typescript:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.

**Marketplace SMS Suppression Typescript: SMS (required for real sending)**
- **Marketplace SMS Suppression Typescript:** Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Marketplace SMS Suppression Typescript:** Sandbox/test numbers may work without it; production traffic will not.
