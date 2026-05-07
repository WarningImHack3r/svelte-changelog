import { tick } from "svelte";

/**
 * Observes the given piece of state and resolves the promise when it
 * reaches the targetted value.
 * It's a variant of `watch` from runed, but with a custom state watching
 * logic and being able to be called from anywhere.
 *
 * @param observedState a getter for the state to observe
 * @param target the target value to resolve the returned promise to
 */
export function waitFor<T>(observedState: () => T, target: T): Promise<void> {
	return new Promise(resolve => {
		const stop = $effect.root(() => {
			$effect(() => {
				if (observedState() === target) {
					stop();
					void tick().then(resolve);
				}
			});
		});
	});
}
