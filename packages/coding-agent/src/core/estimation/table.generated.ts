/**
 * Cold-start task-estimation table. GENERATED FILE — do not edit.
 * Regenerate with: node scripts/build-estimation-table.mjs
 * See ESTIMATION.md for provenance and caveats.
 */
export const ESTIMATION_TABLE = {
	generatedAt: "2026-06-11",
	source: "yoonholee/terminalbench-trajectories",
	sampleSize: 3778,
	global: {
		successRate: 0.32,
		inputTokens: {
			p50: 165339,
			p90: 1919197,
		},
		outputTokens: {
			p50: 8443,
			p90: 37709,
		},
		newInputTokens: {
			p50: 121042,
			p90: 1694919,
		},
		durationSeconds: {
			p50: 367,
			p90: 1514,
		},
	},
	floorTier: {
		pattern: "nano|mini|flash|haiku",
		trials: 1381,
		successRate: 0.26,
		outputTokens: {
			p50: 12614,
			p90: 62017,
		},
		newInputTokens: {
			p50: 123663,
			p90: 2441774,
		},
	},
	models: [
		{
			model: "accounts/fireworks/models/glm-4p6@fireworks_ai",
			trials: 129,
			successRate: 0.22,
			inputTokens: {
				p50: 429022,
				p90: 3759622,
			},
			outputTokens: {
				p50: 7661,
				p90: 30885,
			},
			newInputTokens: {
				p50: 114218,
				p90: 2894741,
			},
			durationSeconds: {
				p50: 333,
				p90: 1242,
			},
		},
		{
			model: "accounts/fireworks/models/minimax-m2@fireworks_ai",
			trials: 131,
			successRate: 0.29,
			inputTokens: {
				p50: 357297,
				p90: 2780832,
			},
			outputTokens: {
				p50: 12096,
				p90: 38473,
			},
			newInputTokens: {
				p50: 357297,
				p90: 2780832,
			},
			durationSeconds: {
				p50: 943,
				p90: 2200,
			},
		},
		{
			model: "claude-haiku-4-5-20251001@anthropic",
			trials: 238,
			successRate: 0.26,
			inputTokens: {
				p50: 896797,
				p90: 5813761,
			},
			outputTokens: {
				p50: 5888,
				p90: 39382,
			},
			newInputTokens: {
				p50: 896797,
				p90: 5813761,
			},
			durationSeconds: {
				p50: 441,
				p90: 1798,
			},
		},
		{
			model: "claude-opus-4-1-20250805@anthropic",
			trials: 256,
			successRate: 0.36,
			inputTokens: {
				p50: 438752,
				p90: 2091839,
			},
			outputTokens: {
				p50: 4375,
				p90: 17364,
			},
			newInputTokens: {
				p50: 419325,
				p90: 2091839,
			},
			durationSeconds: {
				p50: 410,
				p90: 1230,
			},
		},
		{
			model: "claude-opus-4-5-20251101@anthropic",
			trials: 85,
			successRate: 0.54,
			inputTokens: {
				p50: 258390,
				p90: 1896460,
			},
			outputTokens: {
				p50: 6612,
				p90: 26924,
			},
			newInputTokens: {
				p50: 258390,
				p90: 1896460,
			},
			durationSeconds: {
				p50: 352,
				p90: 1508,
			},
		},
		{
			model: "claude-opus-4-6@anthropic",
			trials: 181,
			successRate: 0.67,
			inputTokens: {
				p50: 419360,
				p90: 2799525,
			},
			outputTokens: {
				p50: 6327,
				p90: 26336,
			},
			newInputTokens: {
				p50: 33105,
				p90: 736846,
			},
			durationSeconds: {
				p50: 457,
				p90: 1597,
			},
		},
		{
			model: "claude-sonnet-4-5-20250929@anthropic",
			trials: 243,
			successRate: 0.45,
			inputTokens: {
				p50: 641893,
				p90: 3397899,
			},
			outputTokens: {
				p50: 5474,
				p90: 21955,
			},
			newInputTokens: {
				p50: 641893,
				p90: 3397899,
			},
			durationSeconds: {
				p50: 483,
				p90: 1320,
			},
		},
		{
			model: "deepseek-v3.2@deepseek",
			trials: 85,
			successRate: 0.28,
			inputTokens: {
				p50: 236429,
				p90: 939661,
			},
			outputTokens: {
				p50: 12121,
				p90: 24445,
			},
			newInputTokens: {
				p50: 184381,
				p90: 753640,
			},
			durationSeconds: {
				p50: 576,
				p90: 1278,
			},
		},
		{
			model: "gemini-2.5-flash@gemini",
			trials: 191,
			successRate: 0.12,
			inputTokens: {
				p50: 124920,
				p90: 2574804,
			},
			outputTokens: {
				p50: 10964,
				p90: 84566,
			},
			newInputTokens: {
				p50: 124920,
				p90: 2574804,
			},
			durationSeconds: {
				p50: 280,
				p90: 1773,
			},
		},
		{
			model: "gemini-2.5-pro@gemini",
			trials: 183,
			successRate: 0.27,
			inputTokens: {
				p50: 96466,
				p90: 1411402,
			},
			outputTokens: {
				p50: 17678,
				p90: 92979,
			},
			newInputTokens: {
				p50: 96466,
				p90: 1411402,
			},
			durationSeconds: {
				p50: 345,
				p90: 1832,
			},
		},
		{
			model: "gemini-3-pro-preview@gemini",
			trials: 85,
			successRate: 0.46,
			inputTokens: {
				p50: 73966,
				p90: 967463,
			},
			outputTokens: {
				p50: 16464,
				p90: 66899,
			},
			newInputTokens: {
				p50: 73966,
				p90: 967463,
			},
			durationSeconds: {
				p50: 303,
				p90: 1515,
			},
		},
		{
			model: "gemini-3.1-pro-preview@Google",
			trials: 48,
			successRate: 0.75,
			inputTokens: {
				p50: 251211,
				p90: 2111543,
			},
			outputTokens: {
				p50: 22262,
				p90: 40969,
			},
			newInputTokens: {
				p50: 251211,
				p90: 2111543,
			},
			durationSeconds: {
				p50: 436,
				p90: 962,
			},
		},
		{
			model: "gpt-5-codex@openai",
			trials: 176,
			successRate: 0.38,
			inputTokens: {
				p50: 106309,
				p90: 1267604,
			},
			outputTokens: {
				p50: 17584,
				p90: 59109,
			},
			newInputTokens: {
				p50: 106309,
				p90: 1267604,
			},
			durationSeconds: {
				p50: 677,
				p90: 2130,
			},
		},
		{
			model: "gpt-5-mini@openai",
			trials: 235,
			successRate: 0.24,
			inputTokens: {
				p50: 60274,
				p90: 548971,
			},
			outputTokens: {
				p50: 9621,
				p90: 37246,
			},
			newInputTokens: {
				p50: 60274,
				p90: 548971,
			},
			durationSeconds: {
				p50: 276,
				p90: 1822,
			},
		},
		{
			model: "gpt-5-nano@openai",
			trials: 216,
			successRate: 0.09,
			inputTokens: {
				p50: 48156,
				p90: 554504,
			},
			outputTokens: {
				p50: 17407,
				p90: 92245,
			},
			newInputTokens: {
				p50: 48156,
				p90: 554504,
			},
			durationSeconds: {
				p50: 255,
				p90: 1847,
			},
		},
		{
			model: "gpt-5.1-codex-max@openai",
			trials: 39,
			successRate: 0.72,
			inputTokens: {
				p50: 438084,
				p90: 3207630,
			},
			outputTokens: {
				p50: 14527,
				p90: 25037,
			},
			newInputTokens: {
				p50: 42313,
				p90: 174926,
			},
			durationSeconds: {
				p50: 363,
				p90: 3632,
			},
		},
		{
			model: "gpt-5.1-codex-mini@openai",
			trials: 34,
			successRate: 0.71,
			inputTokens: {
				p50: 414193,
				p90: 1077188,
			},
			outputTokens: {
				p50: 13986,
				p90: 38214,
			},
			newInputTokens: {
				p50: 69359,
				p90: 226785,
			},
			durationSeconds: {
				p50: 252,
				p90: 445,
			},
		},
		{
			model: "gpt-5.1-codex@openai",
			trials: 85,
			successRate: 0.53,
			inputTokens: {
				p50: 163503,
				p90: 1857286,
			},
			outputTokens: {
				p50: 11899,
				p90: 46640,
			},
			newInputTokens: {
				p50: 40489,
				p90: 538271,
			},
			durationSeconds: {
				p50: 454,
				p90: 1844,
			},
		},
		{
			model: "gpt-5.1@openai",
			trials: 42,
			successRate: 0.5,
			inputTokens: {
				p50: 37849,
				p90: 136889,
			},
			outputTokens: {
				p50: 29074,
				p90: 48722,
			},
			newInputTokens: {
				p50: 37849,
				p90: 136889,
			},
			durationSeconds: {
				p50: 541,
				p90: 1826,
			},
		},
		{
			model: "gpt-5.3-codex@openai",
			trials: 30,
			successRate: 0.67,
			inputTokens: {
				p50: 97498,
				p90: 602565,
			},
			outputTokens: {
				p50: 21808,
				p90: 51650,
			},
			newInputTokens: {
				p50: 97498,
				p90: 602565,
			},
			durationSeconds: {
				p50: 503,
				p90: 1853,
			},
		},
		{
			model: "gpt-5@openai",
			trials: 143,
			successRate: 0.38,
			inputTokens: {
				p50: 71952,
				p90: 344367,
			},
			outputTokens: {
				p50: 18719,
				p90: 60390,
			},
			newInputTokens: {
				p50: 71952,
				p90: 344367,
			},
			durationSeconds: {
				p50: 483,
				p90: 1843,
			},
		},
		{
			model: "grok-4-0709@xai",
			trials: 107,
			successRate: 0.29,
			inputTokens: {
				p50: 108800,
				p90: 1259711,
			},
			outputTokens: {
				p50: 2461,
				p90: 13361,
			},
			newInputTokens: {
				p50: 108800,
				p90: 1259711,
			},
			durationSeconds: {
				p50: 928,
				p90: 2077,
			},
		},
		{
			model: "grok-code-fast-1@xai",
			trials: 96,
			successRate: 0.2,
			inputTokens: {
				p50: 133128,
				p90: 818688,
			},
			outputTokens: {
				p50: 2407,
				p90: 6314,
			},
			newInputTokens: {
				p50: 133128,
				p90: 818688,
			},
			durationSeconds: {
				p50: 203,
				p90: 585,
			},
		},
		{
			model: "moonshotai/Kimi-K2-Instruct-0905@together_ai",
			trials: 58,
			successRate: 0.48,
			inputTokens: {
				p50: 332730,
				p90: 1391930,
			},
			outputTokens: {
				p50: 5103,
				p90: 22731,
			},
			newInputTokens: {
				p50: 332730,
				p90: 1391930,
			},
			durationSeconds: {
				p50: 334,
				p90: 1224,
			},
		},
		{
			model: "moonshotai/Kimi-K2-Thinking@together_ai",
			trials: 30,
			successRate: 0.73,
			inputTokens: {
				p50: 82007,
				p90: 3260976,
			},
			outputTokens: {
				p50: 5752,
				p90: 48920,
			},
			newInputTokens: {
				p50: 82007,
				p90: 3260976,
			},
			durationSeconds: {
				p50: 304,
				p90: 2345,
			},
		},
		{
			model: "openai/gpt-oss-120b@together_ai",
			trials: 196,
			successRate: 0.14,
			inputTokens: {
				p50: 21016,
				p90: 369828,
			},
			outputTokens: {
				p50: 3138,
				p90: 11696,
			},
			newInputTokens: {
				p50: 21016,
				p90: 369828,
			},
			durationSeconds: {
				p50: 177,
				p90: 596,
			},
		},
		{
			model: "openai/gpt-oss-20b@together_ai",
			trials: 198,
			successRate: 0.01,
			inputTokens: {
				p50: 9928,
				p90: 79869,
			},
			outputTokens: {
				p50: 3712,
				p90: 16960,
			},
			newInputTokens: {
				p50: 9928,
				p90: 79869,
			},
			durationSeconds: {
				p50: 95,
				p90: 375,
			},
		},
		{
			model: "Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8@together_ai",
			trials: 202,
			successRate: 0.25,
			inputTokens: {
				p50: 672595,
				p90: 2193554,
			},
			outputTokens: {
				p50: 7925,
				p90: 19153,
			},
			newInputTokens: {
				p50: 672595,
				p90: 2193554,
			},
			durationSeconds: {
				p50: 487,
				p90: 1240,
			},
		},
	],
} as const;
