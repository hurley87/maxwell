---
name: gog
description: Google Workspace CLI for Gmail, Calendar, Sheets, and Docs. Use when working with Google Workspace services, sending emails, managing calendar events, or interacting with Sheets/Docs.
---

# gog

Use `gog` for Gmail/Calendar/Sheets/Docs. Requires OAuth setup.

## Setup (once)

- `gog auth credentials /path/to/client_secret.json`
- `gog auth add you@gmail.com --services gmail,calendar,docs,sheets`
- `gog auth list`

## Common Commands

### Gmail

- Search: `gog gmail search 'newer_than:7d' --max 10`
- Messages search (per email, ignores threading): `gog gmail messages search "in:inbox from:ryanair.com" --max 20 --account you@example.com`
- Send (plain): `gog gmail send --to a@b.com --subject "Hi" --body "Hello"`
- Send (multi-line): `gog gmail send --to a@b.com --subject "Hi" --body-file ./message.txt`
- Send (stdin): `gog gmail send --to a@b.com --subject "Hi" --body-file -`
- Send (HTML): `gog gmail send --to a@b.com --subject "Hi" --body-html "<p>Hello</p>"`
- Draft: `gog gmail drafts create --to a@b.com --subject "Hi" --body-file ./message.txt`
- Send draft: `gog gmail drafts send <draftId>`
- Reply: `gog gmail send --to a@b.com --subject "Re: Hi" --body "Reply" --reply-to-message-id <msgId>`

### Calendar

- List events: `gog calendar events <calendarId> --from <iso> --to <iso>`
- Create event: `gog calendar create <calendarId> --summary "Title" --from <iso> --to <iso>`
- Create with color: `gog calendar create <calendarId> --summary "Title" --from <iso> --to <iso> --event-color 7`
- Update event: `gog calendar update <calendarId> <eventId> --summary "New Title" --event-color 4`
- Show colors: `gog calendar colors`

### Sheets

- Get: `gog sheets get <sheetId> "Tab!A1:D10" --json`
- Update: `gog sheets update <sheetId> "Tab!A1:B2" --values-json '[["A","B"],["1","2"]]' --input USER_ENTERED`
- Append: `gog sheets append <sheetId> "Tab!A:C" --values-json '[["x","y","z"]]' --insert INSERT_ROWS`
- Clear: `gog sheets clear <sheetId> "Tab!A2:Z"`
- Metadata: `gog sheets metadata <sheetId> --json`

### Docs

- Export: `gog docs export <docId> --format txt --out /tmp/doc.txt`
- Cat: `gog docs cat <docId>`

## Calendar Colors

Use `gog calendar colors` to see all available event colors (IDs 1-11). Add colors to events with `--event-color <id>` flag.

Event color IDs:
- 1: #a4bdfc
- 2: #7ae7bf
- 3: #dbadff
- 4: #ff887c
- 5: #fbd75b
- 6: #ffb878
- 7: #46d6db
- 8: #e1e1e1
- 9: #5484ed
- 10: #51b749
- 11: #dc2127

## Email Formatting

- Prefer plain text. Use `--body-file` for multi-paragraph messages (or `--body-file -` for stdin).
- Same `--body-file` pattern works for drafts and replies.
- `--body` does not unescape `\n`. If you need inline newlines, use a heredoc or `$'Line 1\n\nLine 2'`.
- Use `--body-html` only when you need rich formatting.
- HTML tags: `<p>` for paragraphs, `<br>` for line breaks, `<strong>` for bold, `<em>` for italic, `<a href="url">` for links, `<ul>`/`<li>` for lists.

### Example (plain text via stdin):

```bash
gog gmail send --to recipient@example.com \
  --subject "Meeting Follow-up" \
  --body-file - <<'EOF'
Hi Name,

Thanks for meeting today. Next steps:
- Item one
- Item two

Best regards,
Your Name
EOF
```

### Example (HTML list):

```bash
gog gmail send --to recipient@example.com \
  --subject "Meeting Follow-up" \
  --body-html "<p>Hi Name,</p><p>Thanks for meeting today. Here are the next steps:</p><ul><li>Item one</li><li>Item two</li></ul><p>Best regards,<br>Your Name</p>"
```

## Notes

- Set `GOG_ACCOUNT=you@gmail.com` to avoid repeating `--account`.
- For scripting, prefer `--json` plus `--no-input`.
- Sheets values can be passed via `--values-json` (recommended) or as inline rows.
- Docs supports export/cat/copy. In-place edits require a Docs API client (not in gog).
- Confirm before sending mail or creating events.
- `gog gmail search` returns one row per thread; use `gog gmail messages search` when you need every individual email returned separately.
