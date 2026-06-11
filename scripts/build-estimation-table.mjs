#!/usr/bin/env node
/**
 * Builds the cold-start task-estimation table from public agent-trajectory
 * data. See ESTIMATION.md.
 *
 * Zero dependencies: uses the Hugging Face datasets-server REST API (plain
 * JSON over HTTP) instead of parquet tooling. Samples rows with populated
 * token counts from yoonholee/terminalbench-trajectories and aggregates
 * per-model token/duration percentiles and success rates.
 *
 * Usage: node scripts/build-estimation-table.mjs
 * Output: packages/coding-agent/src/core/estimation/table.generated.ts
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Uses /rows (fast, reliable) rather than /filter (DuckDB path: 20-30s per
// request and frequent transient 500s); rows without token counts are
// filtered client-side instead.
const DATASET = "yoonholee/terminalbench-trajectories";
const API = "https://datasets-server.huggingface.co/rows";
const PAGE_SIZE = 100;
const TARGET_SAMPLE = 4000;
// ~64% of rows have token counts, so oversample to hit the target.
const USABLE_ROW_YIELD = 0.6;
const CONCURRENCY = 2;

/** Models treated as proxies for the MSLM floor model (Gemma-12B-class). */
const FLOOR_TIER_PATTERN = /nano|mini|flash|haiku/i;

const outPath = join(
	dirname(fileURLToPath(import.meta.url)),
	"..",
	"packages/coding-agent/src/core/estimation/table.generated.ts",
);

async function fetchPage(offset, length) {
	const params = new URLSearchParams({
		dataset: DATASET,
		config: "default",
		split: "train",
		offset: String(offset),
		length: String(length),
	});
	for (let attempt = 0; attempt < 5; attempt++) {
		try {
			const response = await fetch(`${API}?${params}`);
			if (response.ok) {
				// await here so a failure mid-body also falls through to retry
				return await response.json();
			}
		} catch {
			// network hiccup (ECONNRESET etc.) — fall through to backoff
		}
		await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
	}
	// We're sampling; a persistently failing page is not worth aborting the run.
	console.warn(`skipping offset ${offset}: still failing after 5 attempts`);
	return { rows: [] };
}

function percentile(sortedValues, p) {
	if (sortedValues.length === 0) return 0;
	const index = Math.min(sortedValues.length - 1, Math.floor((p / 100) * sortedValues.length));
	return Math.round(sortedValues[index]);
}

function summarize(values) {
	const sorted = [...values].sort((a, b) => a - b);
	return { p50: percentile(sorted, 50), p90: percentile(sorted, 90) };
}

function aggregate(rows) {
	const byModel = new Map();
	for (const row of rows) {
		let entry = byModel.get(row.model);
		if (!entry) {
			entry = { input: [], output: [], newInput: [], duration: [], rewards: [] };
			byModel.set(row.model, entry);
		}
		entry.input.push(row.input_tokens);
		entry.output.push(row.output_tokens);
		entry.newInput.push(Math.max(0, row.input_tokens - (row.cache_tokens ?? 0)));
		entry.duration.push(row.duration_seconds);
		entry.rewards.push(row.reward);
	}

	const models = [...byModel.entries()]
		.filter(([, e]) => e.rewards.length >= 20)
		.map(([model, e]) => ({
			model,
			trials: e.rewards.length,
			successRate: round2(e.rewards.reduce((a, b) => a + b, 0) / e.rewards.length),
			inputTokens: summarize(e.input),
			outputTokens: summarize(e.output),
			newInputTokens: summarize(e.newInput),
			durationSeconds: summarize(e.duration),
		}))
		.sort((a, b) => a.model.localeCompare(b.model));

	const all = {
		input: rows.map((r) => r.input_tokens),
		output: rows.map((r) => r.output_tokens),
		newInput: rows.map((r) => Math.max(0, r.input_tokens - (r.cache_tokens ?? 0))),
		duration: rows.map((r) => r.duration_seconds),
	};
	const floorRows = rows.filter((r) => FLOOR_TIER_PATTERN.test(r.model));

	return {
		generatedAt: new Date().toISOString().slice(0, 10),
		source: DATASET,
		sampleSize: rows.length,
		global: {
			successRate: round2(rows.reduce((a, r) => a + r.reward, 0) / rows.length),
			inputTokens: summarize(all.input),
			outputTokens: summarize(all.output),
			newInputTokens: summarize(all.newInput),
			durationSeconds: summarize(all.duration),
		},
		floorTier: {
			pattern: FLOOR_TIER_PATTERN.source,
			trials: floorRows.length,
			successRate: floorRows.length
				? round2(floorRows.reduce((a, r) => a + r.reward, 0) / floorRows.length)
				: 0,
			outputTokens: summarize(floorRows.map((r) => r.output_tokens)),
			newInputTokens: summarize(floorRows.map((r) => Math.max(0, r.input_tokens - (r.cache_tokens ?? 0)))),
		},
		models,
	};
}

function round2(value) {
	return Math.round(value * 100) / 100;
}

async function main() {
	const probe = await fetchPage(0, 1);
	const total = probe.num_rows_total;
	console.log(`${total} total rows`);

	const wantedPages = Math.ceil(TARGET_SAMPLE / (PAGE_SIZE * USABLE_ROW_YIELD));
	const pages = Math.min(wantedPages, Math.ceil(total / PAGE_SIZE));
	const stride = Math.max(PAGE_SIZE, Math.floor(total / pages));
	const offsets = Array.from({ length: pages }, (_, i) => Math.min(i * stride, total - PAGE_SIZE));

	const rows = [];
	for (let i = 0; i < offsets.length; i += CONCURRENCY) {
		const batch = offsets.slice(i, i + CONCURRENCY);
		const results = await Promise.all(batch.map((offset) => fetchPage(offset, PAGE_SIZE)));
		for (const result of results) {
			for (const { row } of result.rows) {
				if (!(row.input_tokens > 0 && row.output_tokens > 0)) continue;
				rows.push({
					model: row.model,
					reward: row.reward,
					input_tokens: row.input_tokens,
					output_tokens: row.output_tokens,
					cache_tokens: row.cache_tokens,
					duration_seconds: row.duration_seconds,
				});
			}
		}
		console.log(`fetched ${rows.length} usable rows...`);
	}

	const table = aggregate(rows);
	const banner = [
		"/**",
		" * Cold-start task-estimation table. GENERATED FILE — do not edit.",
		" * Regenerate with: node scripts/build-estimation-table.mjs",
		" * See ESTIMATION.md for provenance and caveats.",
		" */",
		"",
	].join("\n");
	const body = `export const ESTIMATION_TABLE = ${JSON.stringify(table, null, "\t")} as const;\n`;

	mkdirSync(dirname(outPath), { recursive: true });
	writeFileSync(outPath, banner + body.replace(/"([a-zA-Z_][a-zA-Z0-9_]*)":/g, "$1:"));
	console.log(`wrote ${outPath} (${table.models.length} models, ${table.sampleSize} sampled rows)`);
}

await main();
