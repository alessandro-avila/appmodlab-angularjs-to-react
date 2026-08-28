# 💰 What the migration cost

[← Back to the lab index](./README.md)

**Modernising this application cost about $1,174.**

Every figure here is read from the CLI's own usage ledger and priced against
[GitHub's published per-token rates](https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing).
Nothing is estimated.

---

## 🔢 The headline

| | |
|---|---:|
| **Total cost** | **117,405 AI credits ≈ $1,174** |
| Model calls | 4,890 |
| Calendar span | 2026‑07‑31 → 2026‑08‑28 |
| Active working days | 12 |

That bought a complete AngularJS → React 19 + TypeScript migration: 23 ADRs, 258
behavioural scenarios, 459 unit tests, 22 React components, and the removal of 975 legacy
files — **plus** the fifteen documentation pages you're reading.

> At roughly **$78 per increment** across six increments, model spend was not the expensive
> part of this project. Deciding *what to build* was.

---

## ⚠️ About the "1.3 billion tokens" number

You may see a raw total of **~1.3 billion tokens** and reasonably panic. Don't. The figure
is real, but it does not mean what it looks like.

**It counts the same conversation being re-read, over and over.**

Every time an agent takes a turn, the whole conversation so far is re-sent to the model. A
60-turn session holding a 250K-token context re-sends that context 60 times — 15M tokens of
throughput for 250K tokens of actual information.

Split by what the tokens *are*:

| Token type | Count | Share | What it really is |
|---|---:|---:|---|
| Cache read | 1,219,662,785 | **93.96%** | Re-reading context already sent |
| Cache write | 65,469,885 | 5.04% | Storing that context for reuse |
| **Fresh input** | **8,365,947** | 0.64% | **Genuinely new text entering the model** |
| **Output** | **4,523,483** | 0.35% | **Everything the agent wrote** |

**The real information volume is the bottom two rows — about 12.9 million tokens.** That is
roughly 1% of the headline number, and it is the figure worth quoting.

The other 99% is caching working exactly as designed. Cached reads are billed at **one tenth**
the price of fresh input precisely because they are cheap to serve.

---

## 💵 Where the money actually went

| Category | Tokens | Rate (Opus 5) | Cost | Share |
|---|---:|---:|---:|---:|
| Cache read | 1,219,662,785 | $0.50 / 1M | ~$607 | **51.7%** |
| Cache write | 65,469,885 | $6.25 / 1M | ~$405 | 34.5% |
| Output | 4,523,483 | $25.00 / 1M | ~$112 | 9.5% |
| Fresh input | 8,365,947 | $5.00 / 1M | ~$41 | 3.5% |
| | | | **~$1,174** | |

**86% of the bill is context management** — keeping the conversation alive, not thinking
about it. Output, the part that produced every file in the repository, was under 10%.

This is the most useful thing to know about agentic cost: **you pay for context, not for
cleverness.**

---

## 🤖 Models used

| Model | Calls | Cost | Share | Published rate (in / cached / write / out per 1M) |
|---|---:|---:|---:|---|
| **Claude Opus 5** | 4,785 | **$1,167.31** | 99.4% | $5.00 / $0.50 / $6.25 / $25.00 |
| GPT‑5.6 Sol | 105 | $6.74 | 0.6% | $2.00 / $0.20 / $2.50 / $10.00 |

Claude Opus 5 did effectively all of the work. The rates above are GitHub's official
published prices, and they reconcile with the recorded credit spend to within 0.8%.

Average prompt size was **268K tokens**, peaking at **790K** — the long-context tier was
genuinely needed on the larger increments.

---

## 📅 The daily curve

| Day | Calls | Credits | ≈ USD | Roughly |
|---|---:|---:|---:|---|
| Jul 31 | 382 | 4,788 | $48 | Setup, first extraction attempts |
| Aug 03 | 522 | 8,479 | $85 | B1 extraction, lab scaffolding |
| Aug 04 | 630 | 9,620 | $96 | PRD + FRD generation |
| Aug 05 | 387 | 5,747 | $57 | FRD refinement |
| Aug 06 | 444 | 6,929 | $69 | Testability gate, green baseline |
| Aug 07 | 55 | 838 | $8 | Path selection |
| Aug 17 | 78 | 1,239 | $12 | Assessment |
| Aug 23 | 244 | 2,721 | $27 | Increment planning |
| Aug 25 | 258 | 6,327 | $63 | Tech stack + Increment 0 |
| **Aug 26** | 554 | 21,396 | **$214** | Increments 1–3 |
| **Aug 27** | 544 | 23,318 | **$233** | Increments 3–4 |
| **Aug 28** | 779 | 25,814 | **$258** | Increment 5 + cutover |

**The last three days account for 60% of the spend.** Everything before them — extraction,
PRD, FRDs, the testability gate, the green baseline, assessment, planning — cost about
**$465** and produced almost no application code.

That is not waste. That $465 is what made the final three days boring: six increments
delivered with no rework and no re-litigated decisions.

---

## 🧾 How to reproduce these numbers

The CLI records one row per model call in a local SQLite ledger:

```sql
SELECT u.model,
       COUNT(*) AS calls,
       SUM(u.input_tokens - u.cache_read_tokens - u.cache_write_tokens) AS fresh_input,
       SUM(u.cache_read_tokens)  AS cache_read,
       SUM(u.cache_write_tokens) AS cache_write,
       SUM(u.output_tokens)      AS output,
       ROUND(SUM(u.total_nano_aiu)/1e9, 0)       AS ai_credits,
       ROUND(SUM(u.total_nano_aiu)/1e9/100.0, 2) AS usd
FROM assistant_usage_events u
JOIN sessions s ON s.id = u.session_id
WHERE s.repository LIKE '%appmodlab-angularjs-to-react%'
GROUP BY u.model;
```

Two things to know about the schema:

- `input_tokens` is the **total** prompt size and already includes `cache_read_tokens` and
  `cache_write_tokens`. Fresh input is `input_tokens − cache_read − cache_write`. Summing
  `input_tokens` on its own triple-counts, which is exactly how you arrive at a frightening
  and meaningless headline.
- `total_nano_aiu ÷ 1e9` = AI credits, and **1 AI credit = $0.01 USD**.

### Two honest caveats

1. **This includes writing the lab.** Producing these fifteen pages, verifying every agent
   claim against source, and the end-to-end browser audit all ran through the same ledger.
   The migration alone would cost meaningfully less.

2. **Per-step attribution is unreliable.** Sessions record the branch they were last on, and
   several long sessions spanned multiple steps. The daily curve is trustworthy; a per-branch
   split would not be, which is why this page reports by day.

---

## 💡 What to take away

- **Quote the cost, not the token count.** $1,174 is the honest number. "1.3 billion tokens"
  is throughput, and 99% of it is cache.
- **Context is the cost driver.** 86% of spend was managing the conversation. Prompt-prefix
  stability is worth far more than prompt brevity — anything that invalidates the cache is
  what actually costs money.
- **Output is nearly free.** Under 10% of spend produced every file in the repo. Optimising
  for terser answers would have saved almost nothing.
- **Front-loading is cheap insurance.** The $465 spent before any code was written is why the
  build phase needed no rework.
- **Asking beats guessing.** Each escalation cost pennies. One wrong assumption propagated
  through six increments would have cost far more than the whole project.
