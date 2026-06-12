# Task Estimation (ETA + feasibility for local models)

Companion to [MSLM.md](MSLM.md). Goal: before a task starts (and while it
runs), tell the user

1. **how long it will likely take** on *their* hardware, and
2. **how confident we are that the current model can do it at all**.

Example of the target UX:

> `~4 min (p90 ~12 min) · confidence: green — bugfix with a test oracle,`
> `similar tasks succeed ~70% on small models`

## Why tokens, and why that's not enough

On local hardware, time is dominated by token throughput, which is
*measurable*, not guessable: llama.cpp reports prefill/decode speeds, and
pi's own session traces record per-turn `usage` plus timestamps.

```
T ≈ Σ_turns (new_input_tokens / prefill_tps  +  output_tokens / decode_tps)
    + Σ tool_wall_time
```

- With prefix KV-cache reuse (pi appends to history), each turn only pays
  prefill for *new* tokens, so total prefill ≈ total new input.
- Tool execution (tests, builds) is token-independent and can dominate;
  it needs its own per-tool-type constant from historical traces.
- Acknowledged limitation: tokens measure **cost**, not **progress**. Some
  tokens are consequential, most aren't. Progress signals come from
  external validation events (tests passing), never from token burn.

## Architecture

Two halves, per the fork's minimalism principle (see MSLM.md §6): all the
heavy lifting is offline; the runtime piece is a lookup plus arithmetic.
No new dependencies, no new tools, no model-in-the-loop, zero added
schema/prompt tokens.

### Offline: `scripts/build-estimation-table.mjs`

Zero-dependency Node script (plain `fetch` against the Hugging Face
datasets-server REST API — no parquet libs, no `datasets` package). It
samples [`yoonholee/terminalbench-trajectories`](https://huggingface.co/datasets/yoonholee/terminalbench-trajectories)
(52K trials of real coding agents on Terminal-Bench 2.0, with per-trial
`input_tokens` / `output_tokens` / `cache_tokens` / `duration_seconds` /
`reward`) and emits a small generated table:

```
packages/coding-agent/src/core/estimation/table.generated.ts
```

containing global and per-model token/duration percentiles, per-model
success rates, and a **floor-tier success rate** (models matching
nano/mini/flash/haiku — the closest public proxy for a Gemma-12B-class
model). Regenerate with:

```bash
node scripts/build-estimation-table.mjs
```

### Runtime: `packages/coding-agent/src/core/estimation/`

- `classifyTask(prompt)` — keyword heuristics → task bucket (`bugfix`,
  `small-feature`, `refactor`, `multi-file-feature`, `investigation`,
  `chore`, `docs`, `other`).
- `estimateTask(prompt, speeds)` — bucket multiplier × table percentiles ×
  measured tok/s → `{ p50Seconds, p90Seconds, tier, reasons }`.
- Feasibility tiers are **coarse on purpose** (green / yellow / red with a
  one-line reason), not a fake calibrated percentage. Signals: floor-tier
  base rate from the table, presence of a test oracle in the prompt
  (external validation boosts small-model success, MSLM R3), cross-cutting
  scope (number of files implicated), and bucket difficulty.

## Data flow

| From the data | Becomes | Used for |
|---|---|---|
| output tokens per trial | p50/p90 per bucket | decode-time estimate |
| input − cache tokens | new-input estimate | prefill-time estimate |
| reward by model tier | P(success \| bucket, tier) | green/yellow/red |
| duration percentiles | sanity anchor | clamping absurd estimates |
| (later) pi trace timestamps | median wall time per tool type | tool-time constant |

## Phases

- **P1 (this PR)**: design doc, offline aggregation script, generated
  cold-start table, runtime estimator module + tests. Not yet wired into
  the agent loop or TUI.
- **P2**: surface the estimate in the TUI when a task starts; measure
  real decode/prefill tok/s from the first turn instead of defaults.
- **P3**: live re-estimation each turn against the bucket's burn-down
  curve; crossing p90 triggers the MSLM R1 re-plan ("not converging —
  split the task"). The estimator and `TURN_BUDGET` share the same table.
- **P4**: personal ledger — completed local sessions re-aggregate into
  the table so estimates personalize to the user's repo, hardware, and
  prompting style. The public dataset is only the cold-start prior.

## Research findings (literature check, June 2026)

A pass over recent papers/datasets on predicting per-task token cost confirms
the "tokens measure cost, not progress" caveat above isn't just intuition —
it's the documented failure mode of the closest prior attempt:

- **["How Do AI Agents Spend Your Money?"](https://arxiv.org/abs/2604.22750)**
  (Apr 2026) ran 8 frontier models on SWE-bench Verified and tried to have
  agents predict their own token cost pre-execution. Headline result: **the
  same (task, model) pair varies up to 30x in total tokens across runs**,
  driven by input tokens (re-reading context across retry loops), not output.
  Self-prediction achieves only "weak-to-moderate" correlation — a coarse
  relative-cost signal at best, never a tight ETA.
- **["Tokenomics"](https://hf.co/papers/2601.14470)** (Jan 2026) found token
  spend is dominated by *iterative review/repair cycles*, a property of how
  the episode unfolds, not of the task description — i.e. not something a
  static `classifyTask(prompt)` can see in advance.
- **["Agent psychometrics"](https://arxiv.org/abs/2604.00594)** (Apr 2026)
  shows the thing that *is* predictable pre-execution: **P(success | task,
  model)** via IRT over task features + an ability decomposition (model
  ability × scaffold ability). This is structurally our `tier`, not our
  `p50Seconds`/`p90Seconds`.
- **["LLMs Encode How Difficult Problems Are"](https://hf.co/papers/2510.18147)**
  and **["Beyond Accuracy"](https://hf.co/papers/2601.12951)**: static
  complexity metrics (AST depth, cyclomatic complexity, path counts) align
  poorly with LLM-perceived difficulty, and the gap widens as models change.
  Outcome-derived difficulty (did the floor model actually succeed on similar
  prompts before) beats structural heuristics.

**Implication:** the duration estimate (`p50Seconds`/`p90Seconds`) is
inherently order-of-magnitude and will not tighten much no matter how the
table or buckets are refined — that's a property of the domain, confirmed
independently. The **feasibility tier is the load-bearing output**; effort
should go there, not into sharpening token percentiles.

### Suggested changes (P2+)

1. **Lead with the tier, not the time.** In `formatEstimate`, the
   green/yellow/red verdict + reason should be the headline; the
   `p50/p90 seconds` should read as "ballpark" (e.g. drop p90 to a coarser
   bucket like "minutes / tens of minutes / long" rather than a number that
   implies precision the data can't support).
2. **P4 ledger should fit feasibility, not tokens.** When local outcomes
   accumulate, prioritize a small logistic/IRT-style model mapping
   (bucket, test-oracle present, cross-cutting scope, ...) → observed
   floor-model success rate. This is the prediction target the literature
   shows is tractable; a per-bucket token regression is not — don't spend
   the ledger's first iterations there.
3. **Don't chase static complexity features for `classifyTask`.** AST/path
   counts etc. are weakly correlated with actual model difficulty per the
   above. Keep the keyword-bucket heuristic coarse; let outcome history (P4)
   refine `successDelta` per bucket instead of adding structural features.
4. **Turn-count as a secondary, more stable unit.** Several papers point at
   step/turn count under a bounded loop (cf. `TURN_BUDGET` in MSLM.md R1) as
   more stable across runs than raw token totals. If P3 wants a
   "how close to the budget are we" signal, turns-used/turns-budgeted is a
   better burn-down axis than tokens-used/tokens-estimated.
5. **No HF dataset gap to fill right now.** Didn't find a dataset pairing
   per-trial tokens with task-type labels across models better than
   `yoonholee/terminalbench-trajectories` (already used). `SWE-rebench`
   ([2505.20411](https://hf.co/papers/2505.20411)) is worth checking for the
   P4 ledger refresh, but isn't confirmed to carry per-trial token/duration
   fields the way the terminalbench dump does.

## Caveats (known, accepted for v0)

- Terminal-Bench is benchmark-flavored (sandboxed, well-specified tasks);
  the cold-start table skews optimistic for messy real-world prompts.
- Reporting conventions differ across the harnesses in the dataset (some
  report only last-step usage), so token percentiles are rough. Medians
  are robust-ish; treat p90s as order-of-magnitude.
- Bucket multipliers are documented priors, not measured per-bucket values
  (Terminal-Bench task names don't map cleanly onto our buckets). The P4
  ledger is what eventually makes them real.
- Frontier-model trajectories don't predict Gemma-12B token counts
  token-for-token; the floor-tier subset (nano/mini/flash/haiku) is the
  closest available proxy.
