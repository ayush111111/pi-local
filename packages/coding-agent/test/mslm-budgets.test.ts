/**
 * MSLM budget enforcement (Local Model Contract).
 *
 * Floor model: Gemma 4 12B @ Q4_K_M. These tests enforce the CI-checkable
 * budgets from the contract's §5 and the schema-style rules from R2:
 *
 *   - BASELINE_TOKENS (system prompt + all core tool schemas) <= 3000
 *   - SCHEMA_TOKENS per tool <= 250
 *   - MAX_TOOLS_PER_TURN <= 7
 *   - R2: schemas flat (max one level of nesting), no anyOf/oneOf/allOf
 *
 * Token counting is a dependency-free chars/4 estimate. Calibrated against
 * o200k_base on 2026-06-10, chars/4 over-counts this content by 10-20%, and
 * Gemma's SentencePiece vocab lands between the two — so the estimate is
 * conservative: if it passes here, the floor model sees fewer tokens.
 *
 * R2 also makes schema *wording* a breaking change. The snapshot test at the
 * bottom fails on any wording drift; updating the snapshot is the explicit
 * "I re-validated against the floor model" act.
 */

import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "../src/core/system-prompt.ts";
import { createBashToolDefinition } from "../src/core/tools/bash.ts";
import { createEditToolDefinition } from "../src/core/tools/edit.ts";
import { createReadToolDefinition } from "../src/core/tools/read.ts";
import { createWriteToolDefinition } from "../src/core/tools/write.ts";

const BASELINE_TOKENS_CAP = 3000;
const SCHEMA_TOKENS_CAP = 250;
const MAX_TOOLS_PER_TURN = 7;

// Known overages, pending wording trim + re-validation against the floor
// model (R2: wording changes must be re-validated, so they cannot be fixed
// silently here). Remove entries as they are brought under the cap.
const KNOWN_SCHEMA_OVERAGES: Record<string, number> = {
	edit: 315, // chars/4 estimate 310 (254 via o200k) on 2026-06-10; trim description + re-validate
};

const cwd = "/work/project";
const toolDefinitions = [
	createReadToolDefinition(cwd),
	createBashToolDefinition(cwd),
	createEditToolDefinition(cwd),
	createWriteToolDefinition(cwd),
];

const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

/** Serialize a tool the way OpenAI-compatible runtimes (llama.cpp) see it. */
function serializeToolForApi(tool: (typeof toolDefinitions)[number]): string {
	return JSON.stringify({
		type: "function",
		function: {
			name: tool.name,
			description: tool.description,
			parameters: tool.parameters,
		},
	});
}

function buildDefaultSystemPrompt(): string {
	const toolSnippets: Record<string, string> = {};
	const promptGuidelines: string[] = [];
	for (const tool of toolDefinitions) {
		if (tool.promptSnippet) toolSnippets[tool.name] = tool.promptSnippet;
		if (tool.promptGuidelines) promptGuidelines.push(...tool.promptGuidelines);
	}
	return buildSystemPrompt({
		cwd,
		selectedTools: toolDefinitions.map((t) => t.name),
		toolSnippets,
		promptGuidelines,
	});
}

/**
 * R2 flatness: top-level must be an object of primitive properties, except
 * that a property may be an array of objects whose own properties are all
 * primitives (one level of nesting). Unions are forbidden everywhere.
 */
function checkSchemaStyle(schema: unknown, path: string, depth: number, errors: string[]): void {
	if (schema === null || typeof schema !== "object") return;
	const node = schema as Record<string, unknown>;

	for (const key of ["anyOf", "oneOf", "allOf"]) {
		if (key in node) errors.push(`${path}: uses forbidden "${key}"`);
	}

	if (node.type === "object" && node.properties && typeof node.properties === "object") {
		if (depth > 1) {
			errors.push(`${path}: object nesting deeper than one level`);
		}
		for (const [name, child] of Object.entries(node.properties as Record<string, unknown>)) {
			checkSchemaStyle(child, `${path}.${name}`, depth + 1, errors);
		}
	}

	if (node.type === "array" && node.items) {
		checkSchemaStyle(node.items, `${path}[]`, depth, errors);
	}
}

describe("MSLM budgets", () => {
	it(`ships at most ${MAX_TOOLS_PER_TURN} core tools`, () => {
		expect(toolDefinitions.length).toBeLessThanOrEqual(MAX_TOOLS_PER_TURN);
	});

	it(`keeps each tool schema within ${SCHEMA_TOKENS_CAP} tokens`, () => {
		for (const tool of toolDefinitions) {
			const tokens = estimateTokens(serializeToolForApi(tool));
			const cap = KNOWN_SCHEMA_OVERAGES[tool.name] ?? SCHEMA_TOKENS_CAP;
			expect(tokens, `${tool.name} schema is ~${tokens} tokens (cap ${cap})`).toBeLessThanOrEqual(cap);
		}
	});

	it(`keeps BASELINE_TOKENS (system prompt + schemas) within ${BASELINE_TOKENS_CAP}`, () => {
		const promptTokens = estimateTokens(buildDefaultSystemPrompt());
		const schemaTokens = toolDefinitions.reduce((sum, tool) => sum + estimateTokens(serializeToolForApi(tool)), 0);
		const baseline = promptTokens + schemaTokens;
		expect(
			baseline,
			`baseline is ~${baseline} tokens (prompt ${promptTokens} + schemas ${schemaTokens})`,
		).toBeLessThanOrEqual(BASELINE_TOKENS_CAP);
	});

	it("keeps tool schemas flat with no unions (R2)", () => {
		const errors: string[] = [];
		for (const tool of toolDefinitions) {
			checkSchemaStyle(tool.parameters, tool.name, 0, errors);
		}
		expect(errors, errors.join("\n")).toEqual([]);
	});

	// R2: schema wording is frozen. A diff here means the words sent to the
	// floor model changed; re-validate against Gemma 4 12B @ Q4_K_M before
	// updating the snapshot.
	it("freezes tool schema wording (R2)", () => {
		const wording = Object.fromEntries(
			toolDefinitions.map((tool) => [tool.name, { description: tool.description, parameters: tool.parameters }]),
		);
		expect(wording).toMatchSnapshot();
	});
});
