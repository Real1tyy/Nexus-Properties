import { defineConfig } from "@playwright/test";

// Two-project split mirroring Prisma-Calendar's pilot harness:
//   - "bootstrap" runs first as a gate, proving Obsidian boots with
//     nexus-properties loaded.
//   - "specs" depends on "bootstrap" — Playwright will not run specs unless
//     bootstrap passes first.
//
// Mode-dependent timeouts:
//   - PWDEBUG / --ui / --debug disable all timeouts so a human can pause.
//   - PW_DEMO slows actions for visual review.
//   - Default headless runs get a 45s test budget — Obsidian spawn is 1-3s on
//     a healthy machine and can spike to 30-35s under disk pressure.

const DEMO_ON = !!process.env.PW_DEMO && process.env.PW_DEMO !== "0" && process.env.PW_DEMO !== "false";
const DEBUG_ON = !!process.env.PWDEBUG || process.argv.includes("--ui") || process.argv.includes("--debug");

const TEST_TIMEOUT = DEBUG_ON ? 0 : DEMO_ON ? 1_800_000 : 45_000;
const EXPECT_TIMEOUT = DEBUG_ON ? 0 : DEMO_ON ? 120_000 : 5_000;
const ACTION_TIMEOUT = DEBUG_ON ? 0 : DEMO_ON ? 120_000 : 5_000;

export default defineConfig({
	outputDir: "./test-results",
	fullyParallel: !DEBUG_ON,
	workers: DEBUG_ON ? 1 : 3,
	timeout: TEST_TIMEOUT,
	expect: { timeout: EXPECT_TIMEOUT },
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 1,
	reporter: [["line"], ["html", { open: "never", outputFolder: "./playwright-report" }]],
	use: {
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
		actionTimeout: ACTION_TIMEOUT,
	},
	projects: [
		{
			name: "bootstrap",
			testDir: "./setup",
			testMatch: /bootstrap\.spec\.ts$/,
		},
		{
			name: "specs",
			testDir: "./specs",
			testMatch: /.*\.spec\.ts$/,
			dependencies: ["bootstrap"],
		},
	],
});
