/**
 * Pre-task ETA and feasibility estimation for local models. See ESTIMATION.md.
 *
 * Pure lookup + arithmetic against a generated cold-start table — no model
 * calls, no dependencies, no added prompt/schema tokens (MSLM-compliant).
 * Not yet wired into the agent loop (phase P1).
 */

import { ESTIMATION_TABLE } from "./table.generated.ts";

export type TaskBucket =
	| "bugfix"
	| "small-feature"
	| "refactor"
	| "multi-file-feature"
	| "investigation"
	| "chore"
	| "docs"
	| "other";

export type FeasibilityTier = "green" | "yellow" | "red";

export interface SpeedProfile {
	/** Measured decode speed in tokens/second (e.g. from llama.cpp timings). */
	decodeTokensPerSecond: number;
	/** Measured prompt-processing speed in tokens/second. */
	prefillTokensPerSecond: number;
}

/** Typical 12B Q4_K_M on consumer hardware; replace with measured values. */
export const DEFAULT_LOCAL_SPEEDS: SpeedProfile = {
	decodeTokensPerSecond: 20,
	prefillTokensPerSecond: 400,
};

export interface TaskEstimate {
	bucket: TaskBucket;
	p50Seconds: number;
	p90Seconds: number;
	tier: FeasibilityTier;
	reasons: string[];
}

interface BucketProfile {
	/** Multiplier on the table's global token percentiles. Documented priors,
	 *  not measured per-bucket values — refined later by the local ledger (P4). */
	tokenMultiplier: number;
	/** Adjustment to the floor-tier base success rate. */
	successDelta: number;
}

const BUCKET_PROFILES: Record<TaskBucket, BucketProfile> = {
	bugfix: { tokenMultiplier: 0.8, successDelta: 0.05 },
	"small-feature": { tokenMultiplier: 1.0, successDelta: 0 },
	refactor: { tokenMultiplier: 1.6, successDelta: -0.15 },
	"multi-file-feature": { tokenMultiplier: 2.0, successDelta: -0.2 },
	investigation: { tokenMultiplier: 0.6, successDelta: 0.1 },
	chore: { tokenMultiplier: 0.5, successDelta: 0.1 },
	docs: { tokenMultiplier: 0.4, successDelta: 0.15 },
	other: { tokenMultiplier: 1.0, successDelta: -0.05 },
};

const BUCKET_PATTERNS: [TaskBucket, RegExp][] = [
	["bugfix", /\b(fix|bug|broken|fail(s|ing|ed)?|crash(es|ing)?|error|regression)\b/i],
	["docs", /\b(readme|document(ation)?|docstring|comment|changelog)\b/i],
	["chore", /\b(bump|upgrade|update dep|lint|format|rename file|typo|cleanup|clean up)\b/i],
	["refactor", /\b(refactor|extract|consolidate|restructure|rename|move|split up|decouple|dedupe)\b/i],
	["investigation", /\b(why|explain|investigate|understand|what happens|how does|look into|diagnose)\b/i],
	["multi-file-feature", /\b(implement|add support|integrate|across|migration|end[- ]to[- ]end|subsystem)\b/i],
	["small-feature", /\b(add|create|support|expose|new (flag|option|field|endpoint|command))\b/i],
];

/** Matches prompts that carry an external validation signal (MSLM R3). */
const TEST_ORACLE_PATTERN =
	/\b(failing test|test (fails|failing|is red)|repro(duction)? (case|script)|typecheck error|type error|stack ?trace)\b/i;

/** Rough cross-cutting-scope signal: count path-like tokens in the prompt. */
const PATH_PATTERN = /[\w-]+(?:\/[\w.-]+)+|\b[\w-]+\.(ts|js|tsx|jsx|py|rs|go|java|md|json|yml|yaml)\b/g;

export function classifyTask(prompt: string): TaskBucket {
	for (const [bucket, pattern] of BUCKET_PATTERNS) {
		if (pattern.test(prompt)) {
			return bucket;
		}
	}
	return "other";
}

function estimateSeconds(outputTokens: number, newInputTokens: number, speeds: SpeedProfile): number {
	return Math.round(outputTokens / speeds.decodeTokensPerSecond + newInputTokens / speeds.prefillTokensPerSecond);
}

export function estimateTask(prompt: string, speeds: SpeedProfile = DEFAULT_LOCAL_SPEEDS): TaskEstimate {
	const bucket = classifyTask(prompt);
	const profile = BUCKET_PROFILES[bucket];
	const { global, floorTier } = ESTIMATION_TABLE;

	const p50Seconds = estimateSeconds(
		global.outputTokens.p50 * profile.tokenMultiplier,
		global.newInputTokens.p50 * profile.tokenMultiplier,
		speeds,
	);
	const p90Seconds = estimateSeconds(
		global.outputTokens.p90 * profile.tokenMultiplier,
		global.newInputTokens.p90 * profile.tokenMultiplier,
		speeds,
	);

	const reasons: string[] = [`task type: ${bucket}`];
	let score = floorTier.successRate + profile.successDelta;

	if (TEST_ORACLE_PATTERN.test(prompt)) {
		score += 0.15;
		reasons.push("external validation available (test/typecheck oracle)");
	} else {
		reasons.push("no test oracle detected");
	}

	const pathCount = new Set(prompt.match(PATH_PATTERN) ?? []).size;
	if (pathCount > 3) {
		score -= 0.1;
		reasons.push(`cross-cutting scope (${pathCount} files referenced)`);
	}

	const tier: FeasibilityTier = score >= 0.45 ? "green" : score >= 0.25 ? "yellow" : "red";
	reasons.push(
		`floor-tier models succeed ${Math.round(floorTier.successRate * 100)}% on comparable tasks` +
			` (${floorTier.trials} trials, ${ESTIMATION_TABLE.source})`,
	);

	return { bucket, p50Seconds, p90Seconds, tier, reasons };
}

/** Render an estimate as a single status line. */
export function formatEstimate(estimate: TaskEstimate): string {
	const minutes = (seconds: number) => (seconds < 90 ? `${seconds}s` : `~${Math.round(seconds / 60)} min`);
	return `${minutes(estimate.p50Seconds)} (p90 ${minutes(estimate.p90Seconds)}) · confidence: ${estimate.tier} — ${estimate.reasons[0]}, ${estimate.reasons[1]}`;
}
