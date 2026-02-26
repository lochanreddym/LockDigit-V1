#!/usr/bin/env node

const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const dryRun = process.argv.includes("--dry-run");
const webhookUrl = process.env.LOCKDIGIT_WEBHOOK_URL;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

function signStripePayload(payload, secret, timestamp = Math.floor(Date.now() / 1000)) {
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

async function sendWebhookEvent({ payload, secret, label }) {
  const body = JSON.stringify(payload);
  const signature = signStripePayload(body, secret);

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
    body,
  });

  const text = await response.text();
  return {
    label,
    status: response.status,
    body: text,
  };
}

function buildEvent(eventId, paymentIntentId, status) {
  return {
    id: eventId,
    type: `payment_intent.${status}`,
    data: {
      object: {
        id: paymentIntentId,
        status,
        latest_charge: `ch_${eventId}`,
      },
    },
  };
}

async function run() {
  if (dryRun) {
    console.log("Failure-injection dry run");
    console.log("- valid webhook delivery");
    console.log("- duplicate webhook replay");
    console.log("- invalid signature rejection");
    console.log("- delayed webhook completion");
    return;
  }

  if (!webhookUrl || !webhookSecret) {
    throw new Error(
      "Set LOCKDIGIT_WEBHOOK_URL and STRIPE_WEBHOOK_SECRET before running this script."
    );
  }

  const token = `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const paymentIntentId = `pi_lockdigit_${token}`;
  const eventId = `evt_lockdigit_${token}`;

  const validEvent = buildEvent(eventId, paymentIntentId, "succeeded");
  const delayedEvent = buildEvent(
    `evt_lockdigit_delayed_${token}`,
    `pi_lockdigit_delayed_${token}`,
    "succeeded"
  );

  const results = [];

  results.push(
    await sendWebhookEvent({
      label: "valid delivery",
      payload: validEvent,
      secret: webhookSecret,
    })
  );

  results.push(
    await sendWebhookEvent({
      label: "duplicate replay",
      payload: validEvent,
      secret: webhookSecret,
    })
  );

  results.push(
    await sendWebhookEvent({
      label: "invalid signature",
      payload: buildEvent(
        `evt_lockdigit_bad_sig_${token}`,
        `pi_lockdigit_bad_sig_${token}`,
        "succeeded"
      ),
      secret: "not-the-real-secret",
    })
  );

  await new Promise((resolve) => setTimeout(resolve, 1500));
  results.push(
    await sendWebhookEvent({
      label: "delayed completion",
      payload: delayedEvent,
      secret: webhookSecret,
    })
  );

  for (const result of results) {
    console.log(
      `[${result.label}] status=${result.status} body="${result.body.slice(0, 120)}"`
    );
  }

  assert.equal(results[0].status, 200, "valid delivery must succeed");
  assert.equal(results[1].status, 200, "duplicate replay must be accepted and deduped");
  assert.equal(results[2].status, 400, "invalid signature must be rejected");
  assert.equal(results[3].status, 200, "delayed completion must succeed");

  console.log("Failure-injection checks completed successfully.");
}

run().catch((error) => {
  console.error("Failure-injection run failed:", error.message);
  process.exitCode = 1;
});
