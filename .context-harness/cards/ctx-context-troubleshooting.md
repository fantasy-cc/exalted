---
id: ctx-context-troubleshooting
kind: context
importance: 0.74
confidence: confirmed
source: CONTEXT.md#troubleshooting
chunk: .context-harness/chunks/ctx-context-troubleshooting.md
tokens_est: 829
tags: [context, troubleshooting, common-issues, performance-metrics]
---

# CONTEXT.md: 🔧 TROUBLESHOOTING

## Summary
Problem: Currencies not loading or incomplete data

## Use when
- working on 🔧 troubleshooting

## Key facts
- Problem: Currencies not loading or incomplete data
- Debug:
- cd backend/services
- python poe2scout.py
- tail -f ../logs/arbitrage.log | grep "currency"

## Open next
- `CONTEXT.md#troubleshooting`
- `.context-harness/chunks/ctx-context-troubleshooting.md`
