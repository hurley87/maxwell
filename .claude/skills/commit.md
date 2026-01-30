---
name: commit
description: Analyze current changes and propose a commit message for approval.
---

# Commit Skill

Analyze current changes and propose a commit message for approval.

## Instructions

1. Run `git status` and `git diff` to see all changes
2. Analyze the changes to understand WHAT was changed and WHY (the decision or intent, not just "updated file X")
3. Write a concise commit message (1-2 sentences) that describes the change from a user/developer perspective
4. Show the proposed commit message to the user
5. Ask the user if they want to commit and push with this message

## Commit Message Guidelines

- Focus on the decision or behavior change, not the files modified
- Use present tense ("Add feature" not "Added feature")
- Be specific but concise
- Examples of good messages:
  - "Close date picker automatically when a date is selected"
  - "Add dark mode support with system preference detection"
  - "Fix task checkbox not updating state on click"

**IMPORTANT**: Do NOT commit or push until the user approves.
