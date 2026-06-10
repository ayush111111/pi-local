# Local Model Contract (MSLM)

> **Minimum Supported Local Model: Gemma 4 12B @ Q4_K_M**
>
> This fork of pi targets local inference on consumer hardware. Every tool
> schema, prompt, and loop-design decision in this codebase MUST stay within
> what the floor model can reliably handle. PRs that exceed the budgets in
> §5 will be rejected (CI enforcement planned).

This document is **normative**. The key words MUST, MUST NOT, and SHOULD are
to be interpreted as in RFC 2119.

---

## 1. The Declaration

| Parameter | Pinned value | Rationale |
|---|---|---|
| Model | Gemma 4 12B (instruction-tuned) | Smallest model with native function calling + agentic training |
| Quantization | Q4_K_M | Unpinned quants make "compatible" untestable; structured-output reliability degrades below Q4 |
| Thinking mode | TODO: on/off — decide after test-rig results | Thinking burns token budget; measure whether it pays for itself at 12B |
| Max context (model) | 256K | Model capability, NOT our working budget — see §5 |
| Reference runtime | llama.cpp / MLX | Lower overhead than Ollama wrappers |

Compatibility claims against any other model/quant are out of scope.

## 2. What the floor model CAN do (rely on these)

- **Native single-turn tool calling.** Gemma 4 12B emits structured function
  calls without prompt-hacked JSON. Single-turn call accuracy is the
  *strongest* capability class for small models on BFCL.
- **Code generation for routine, well-scoped tasks.** Day-to-day edits,
  completions, and corrections are within scope.
- **Long context ingestion** (reading), within the §5 working-set budget.

## 3. What the floor model CANNOT do (design around these)

Each limitation below is evidence-backed; each maps to a rule in §4.

| # | Limitation | Evidence |
|---|---|---|
| L1 | **Multi-turn collapse.** Tool-call accuracy degrades sharply with turn depth and accumulated state ("agentic chasm"). Sub-15B models drop from ~80% single-turn to ~35% or lower multi-turn. | BFCL v3/v4 multi-turn category |
| L2 | **Format sensitivity.** Small variations in tool-schema phrasing/structure swing call accuracy materially. | BFCL v4 Part 3 |
| L3 | **Degenerate self-critique.** The model cannot reliably judge or repair its own output; critique loops converge on agreement, not correctness. | Known small-model failure mode |
| L4 | **Structured-output fragility under quantization.** Q4 increases malformed JSON / schema-violating calls vs. full precision. | Quantization studies; own testing |
| L5 | **Context-pressure degradation.** Reliability drops well before the nominal context limit as accumulated feedback/history grows; KV cache also competes with weights for unified memory on 16-32GB machines. | Long-context evals; bandwidth/memory math |
| L6 | **Error-recovery brittleness.** After a failed tool call, small models break character, loop, or lecture instead of retrying per protocol. | Small-model function-calling evals |

## 4. Normative rules (each traces to §3)

- **R1 (← L1): Bounded loops.** Agent tasks MUST decompose into episodes of
  at most `TURN_BUDGET` tool-call turns. At the budget, the loop MUST
  re-plan from a compacted state summary rather than continue accumulating
  raw history.
- **R2 (← L2): Frozen schema style.** Tool schemas MUST be flat (max one
  level of nesting), MUST NOT use unions/anyOf, and MUST use short
  imperative descriptions. Schema wording changes are breaking changes and
  MUST be re-validated against the floor model.
- **R3 (← L3): External validation only.** The loop MUST NOT use the model
  as the judge of its own output. Correctness signals come from compilers,
  tests, linters, and schema validators. "Ask the model to double-check"
  is forbidden as a correctness mechanism.
- **R4 (← L4): Validate-and-repair every call.** Every tool call MUST be
  validated against its schema before execution. On failure, the loop MAY
  retry with the validation error appended, at most `REPAIR_RETRIES` times,
  then MUST fail the episode (not the session).
- **R5 (← L5): Working-set ceiling.** The live context (system prompt +
  schemas + history + files) MUST stay under `WORKING_SET` tokens,
  regardless of the model's nominal 256K. File reads MUST be ranged/paged;
  full-file dumps into context are forbidden above `FILE_READ_CAP` tokens.
- **R6 (← L6): Scripted error protocol.** Tool errors MUST be returned in a
  fixed, terse template the model has seen in the system prompt, with an
  explicit next-action instruction. Free-form stack traces MUST be
  truncated to `ERROR_CAP` tokens.
- **R7 (← L1, L5): Externalized state.** Task state (plan, progress,
  decisions) MUST live in a file the agent reads/writes, not in
  conversation history. History is disposable; the state file is not.

## 5. Budgets (CI-enforceable)

> ⚠️ Values marked TODO are placeholders until measured against the fork's
> actual baseline (`grep` the tool schemas + system prompt, token-count
> them). Do not tune budgets you haven't measured.

| Budget | Value | Enforced by |
|---|---|---|
| `BASELINE_TOKENS` (system prompt + all tool schemas) | ~1,190 measured (o200k proxy); cap 3,000 | `packages/coding-agent/test/mslm-budgets.test.ts` |
| `MAX_TOOLS_PER_TURN` | 7 (pi core ships 4: read/write/edit/bash) | `packages/coding-agent/test/mslm-budgets.test.ts` |
| `SCHEMA_TOKENS` per tool | ≤ 250 (edit currently exceeds; pending wording trim + re-validation) | `packages/coding-agent/test/mslm-budgets.test.ts` |
| `TURN_BUDGET` per episode | TODO — start at 10, calibrate via test rig | Runtime assert |
| `WORKING_SET` | TODO — start at 32K | Runtime assert |
| `FILE_READ_CAP` | 4K tokens per read (paged beyond) | Tool impl |
| `ERROR_CAP` | 500 tokens (~2,000 chars) | `packages/ai/src/utils/validation.ts` |
| `REPAIR_RETRIES` | 2 | Runtime const |

## 6. Coding-practice changes for contributors

Compared to upstream pi (which assumes frontier models):

1. **Write specs, not vibes.** The floor model executes well-scoped tasks;
   it does not infer intent. Task prompts in this fork are contracts too.
2. **Prefer many small tool calls over one clever one.** Single-turn
   reliability is the strength; lean on it.
3. **Never add a tool without budgeting it.** New tool = schema tokens +
   selection-confusion cost for every turn, forever.
4. **Test prompt changes against the floor model, not against Claude/GPT.**
   If it only works on a frontier model, it doesn't work.

## 7. Open questions / revisit

- [ ] Thinking mode on or off at 12B (measure, don't guess)
- [ ] `TURN_BUDGET` calibration from the empirical test rig
- [ ] `WORKING_SET` / `FILE_READ_CAP` calibration (current truncation defaults are tuned for frontier models, not the floor)
- [ ] Whether MTP/speculative decoding changes any budget (speed ≠ reliability)
