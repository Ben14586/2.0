# Telegram Bot Ops

## Purpose

Telegram is used as an admin operations alert channel for the Game Services backend.

## What It Sends

- New order alert with order ID, game, package, price, platform, contact, slip status, and admin link.
- Slip uploaded alert with expected amount, image size, slip URL, and admin link.
- Order status changed alert when admin updates an order.
- Manual test alert from the admin panel.

## Setup

1. Open Telegram and chat with `@BotFather`.
2. Create a bot with `/newbot`.
3. Copy the bot token.
4. Send one message to your bot from the Telegram account/group that should receive alerts.
5. Get the chat ID:

```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates
```

6. Set these on Render/Railway:

```text
TELEGRAM_BOT_TOKEN=<private-bot-token>
TELEGRAM_CHAT_ID=<private-chat-id>
```

## Test

1. Open `admin.html`.
2. Login as admin.
3. Click `ทดสอบ Telegram`.
4. Confirm Telegram receives the test message.

## Safety

- Never commit `TELEGRAM_BOT_TOKEN` to GitHub.
- Store it only in Render/Railway environment variables or local `.env`.
- If the token leaks, regenerate it in BotFather.
