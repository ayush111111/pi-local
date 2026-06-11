import { describe, expect, it } from "vitest";
import { classifyTask, DEFAULT_LOCAL_SPEEDS, estimateTask, formatEstimate } from "../src/core/estimation/estimation.ts";
import { ESTIMATION_TABLE } from "../src/core/estimation/table.generated.ts";

describe("classifyTask", () => {
	it("recognizes bugfixes", () => {
		expect(classifyTask("fix the failing tokenizer test")).toBe("bugfix");
		expect(classifyTask("the app crashes on startup")).toBe("bugfix");
	});

	it("recognizes refactors", () => {
		expect(classifyTask("extract the validation logic into its own module")).toBe("refactor");
	});

	it("recognizes investigation tasks", () => {
		expect(classifyTask("why does the cache miss on every second request?")).toBe("investigation");
	});

	it("recognizes docs and chores", () => {
		expect(classifyTask("update the README with install instructions")).toBe("docs");
		expect(classifyTask("bump typescript to 5.9")).toBe("chore");
	});

	it("falls back to other", () => {
		expect(classifyTask("hello there")).toBe("other");
	});
});

describe("estimateTask", () => {
	it("produces positive, ordered time estimates", () => {
		const estimate = estimateTask("fix the failing test in truncate.ts");
		expect(estimate.p50Seconds).toBeGreaterThan(0);
		expect(estimate.p90Seconds).toBeGreaterThanOrEqual(estimate.p50Seconds);
	});

	it("scales with measured speeds", () => {
		const slow = estimateTask("add a new flag", { ...DEFAULT_LOCAL_SPEEDS, decodeTokensPerSecond: 5 });
		const fast = estimateTask("add a new flag", { ...DEFAULT_LOCAL_SPEEDS, decodeTokensPerSecond: 50 });
		expect(slow.p50Seconds).toBeGreaterThan(fast.p50Seconds);
	});

	it("boosts confidence when a test oracle is present", () => {
		const withOracle = estimateTask("fix the failing test in src/core/tools/read.ts");
		const withoutOracle = estimateTask("refactor the entire tool layer across all packages");
		const tierRank = { green: 2, yellow: 1, red: 0 };
		expect(tierRank[withOracle.tier]).toBeGreaterThanOrEqual(tierRank[withoutOracle.tier]);
		expect(withOracle.reasons.join(" ")).toContain("external validation");
	});

	it("cites the data source in its reasons", () => {
		const estimate = estimateTask("fix the bug");
		expect(estimate.reasons.join(" ")).toContain(ESTIMATION_TABLE.source);
	});
});

describe("formatEstimate", () => {
	it("renders a one-line summary", () => {
		const line = formatEstimate(estimateTask("fix the failing test"));
		expect(line).toMatch(/confidence: (green|yellow|red)/);
		expect(line).toContain("task type: bugfix");
	});
});

describe("generated table", () => {
	it("has sane cold-start data", () => {
		expect(ESTIMATION_TABLE.sampleSize).toBeGreaterThan(1000);
		expect(ESTIMATION_TABLE.global.outputTokens.p50).toBeGreaterThan(0);
		expect(ESTIMATION_TABLE.global.outputTokens.p90).toBeGreaterThanOrEqual(ESTIMATION_TABLE.global.outputTokens.p50);
		expect(ESTIMATION_TABLE.floorTier.trials).toBeGreaterThan(100);
		expect(ESTIMATION_TABLE.floorTier.successRate).toBeGreaterThan(0);
		expect(ESTIMATION_TABLE.floorTier.successRate).toBeLessThanOrEqual(1);
	});
});
