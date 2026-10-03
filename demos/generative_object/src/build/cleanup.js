//#region demos/generative_object/src/cleanup.ts
/** Attempts every release before reporting the first failure to the lifecycle. */
function runCleanupSteps(steps) {
	let firstError;
	for (const step of steps) try {
		step();
	} catch (error) {
		console.error("[generative_object] cleanup failed", error);
		firstError ??= error;
	}
	if (firstError !== void 0) throw firstError;
}
//#endregion
export { runCleanupSteps };
