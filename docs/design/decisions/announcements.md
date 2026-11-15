# Announcements

When a bulletin is published, a Telegram channel hears about it: the bulletin's name and time, every story's short title under its section, a link to the one-minute page and one link to the bulletin, which Telegram turns into a large preview with the bulletin's share picture. One message per language: a Turkish channel and, if wanted, an English one. Nothing else is ever sent, no reminders and no alerts in between.

The message is sent by `.github/workflows/announce.yml` when a bulletin file lands on `main`, after the site answers for that bulletin's page (the deploy takes a minute or two). It is off until the repository secrets exist, and a run without them does nothing and succeeds.

To turn it on: create a bot with @BotFather (`/newbot`), add the bot as an administrator of the channel, and save three repository secrets: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID_TR` (the channel's `@name` or its numeric id) and, for an English channel, `TELEGRAM_CHAT_ID_EN`. To send or test one bulletin by hand, start the workflow from the Actions tab with a file name such as `2026-11-15-morning.json`.
