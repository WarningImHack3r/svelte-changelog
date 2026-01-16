<script lang="ts">
	import { tick } from "svelte";
	import type { ClassValue } from "svelte/elements";
	import { MediaQuery } from "svelte/reactivity";
	import { mode } from "mode-watcher";

	type Props = {
		enabled?: boolean;
		class?: ClassValue;
	};

	let { enabled = true, class: className }: Props = $props();

	const maxParticles = 100;
	const speed = 300;
	const snowLightColor = "rgba(0, 0, 0, 0.2)";
	const snowDarkColor = "rgba(255, 255, 255, 0.2)";

	let width = $state(0);
	let height = $state(0);
	let snowflakes = $state<HTMLCanvasElement>();
	let particles: {
		x: number;
		y: number;
		radius: number;
		density: number;
	}[] = [];
	let frame: ReturnType<typeof requestAnimationFrame>;
	let timeout: ReturnType<typeof setTimeout>;

	function resize() {
		if (!snowflakes) return;

		width = window.innerWidth;
		height = window.innerHeight;

		snowflakes.width = width;
		snowflakes.height = height;
	}

	function debounceResize() {
		clearTimeout(timeout);
		cancelAnimationFrame(frame);
		timeout = setTimeout(startSnow, 100);
	}

	function regenerateParticles() {
		const newParticles: typeof particles = [];
		for (let i = 0; i < maxParticles; i++) {
			newParticles.push({
				x: Math.random() * width,
				y: Math.random() * height,
				radius: 1 + Math.random() * 2,
				density: Math.random() * maxParticles
			});
		}
		return newParticles;
	}

	function startSnow() {
		resize();

		particles = regenerateParticles();

		if (!snowflakes) return;
		const ctx = snowflakes.getContext("2d");
		if (!ctx) return;

		// Draw the flakes
		function draw() {
			if (!ctx) return; // redundant but TypeScript (rightfully?) complains otherwise
			ctx.clearRect(0, 0, width, height);

			for (let particle of particles) {
				ctx.fillStyle = mode.current === "dark" ? snowDarkColor : snowLightColor;
				ctx.beginPath();
				ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2, true);
				ctx.fill();
			}
			update();
		}

		// Move the snowflakes
		let angle = 0;
		let margin = 50;
		function update(time = Date.now()) {
			angle = time / 3000;
			for (let [i, particle] of particles.entries()) {
				// Updating X and Y coordinates
				particle.y += 1 + Math.cos(angle + particle.density) + particle.radius / 2;
				particle.x += Math.sin(angle) * 2;

				// Sending flakes back from the top when it exits
				if (particle.x > width + margin || particle.x < -margin || particle.y > height) {
					if (i % 3 > 0) {
						// 2/3 of the flakes
						particles[i] = {
							x: Math.random() * width,
							y: -10,
							radius: particle.radius,
							density: particle.density
						};
					} else {
						// If the flake is exiting from the right
						particles[i] = {
							x:
								Math.sin(angle) > 0
									? -margin // Enter from the left
									: width + margin, // Enter from the right
							y: Math.random() * height,
							radius: particle.radius,
							density: particle.density
						};
					}
				}
			}
			frame = requestAnimationFrame(() => {
				timeout = setTimeout(draw, 1000 / 60 / (speed / 1000));
			});
		}

		// Animation loop
		draw();
	}

	let reduceMotion = new MediaQuery("prefers-reduced-motion: reduce");
	$effect(() => {
		if (!enabled || reduceMotion.current) {
			clearTimeout(timeout);
			cancelAnimationFrame(frame);
			snowflakes?.getContext("2d")?.clearRect(0, 0, width, height);
		} else {
			tick().then(startSnow);
		}
	});
	$effect(() => () => {
		clearTimeout(timeout);
		cancelAnimationFrame(frame);
	});
</script>

<svelte:window onresize={debounceResize} />

<canvas aria-hidden="true" bind:this={snowflakes} {width} {height} class={className}></canvas>
