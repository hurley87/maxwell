---
name: gog
description: Google Workspace CLI for Gmail, Calendar, Sheets, and Docs. Use when working with Google Workspace services, sending emails, managing calendar events, or interacting with Sheets/Docs.
---

# gog

Google Workspace CLI for Gmail, Calendar, Sheets, and Docs.

## Common Commands

### Gmail
- Search: `gog gmail search 'newer_than:7d' --max 10`
- Messages search: `gog gmail messages search "in:inbox from:example.com" --max 20`
- Send (plain): `gog gmail send --to a@b.com --subject "Hi" --body "Hello"`
- Send (multi-line): `gog gmail send --to a@b.com --subject "Hi" --body-file ./message.txt`
- Send (stdin): `gog gmail send --to a@b.com --subject "Hi" --body-file -`
- Draft: `gog gmail drafts create --to a@b.com --subject "Hi" --body-file ./message.txt`
- Reply: `gog gmail send --to a@b.com --subject "Re: Hi" --body "Reply" --reply-to-message-id <msgId>`

### Calendar
- List events: `gog calendar events <calendarId> --from <iso> --to <iso>`
- Create event: `gog calendar create <calendarId> --summary "Title" --from <iso> --to <iso>`
- Update event: `gog calendar update <calendarId> <eventId> --summary "New Title"`
- Show colors: `gog calendar colors`

### Sheets
- Get: `gog sheets get <sheetId> "Tab!A1:D10" --json`
- Update: `gog sheets update <sheetId> "Tab!A1:B2" --values-json '[["A","B"],["1","2"]]'`
- Append: `gog sheets append <sheetId> "Tab!A:C" --values-json '[["x","y","z"]]'`

### Docs
- Export: `gog docs export <docId> --format txt --out /tmp/doc.txt`
- Cat: `gog docs cat <docId>`

## Email Formatting
- Prefer plain text with `--body-file` for multi-paragraph messages
- Use heredoc for stdin: `--body-file - <<'EOF' ... EOF`
- Close emails with "Thanks," not "Best regards,"

## Notes
- Set `GOG_ACCOUNT=you@gmail.com` to avoid repeating `--account`
- Confirm before sending mail or creating events
