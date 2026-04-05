## Real-World Use Cases

### 1. Stripe Webhook Testing
```bash
# Start capture server
npx webhook-tester &

# Configure Stripe to send webhooks to http://your-ngrok/hook/stripe
# Inspect what Stripe actually sends
curl http://localhost:5000/api/webhooks
```

### 2. CI Webhook Verification
Assert that your app sends the correct webhook payload after an action.
