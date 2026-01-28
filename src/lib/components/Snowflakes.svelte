<script lang="ts">
	import type { Attachment } from "svelte/attachments";
	import type { ClassValue } from "svelte/elements";
	import { innerHeight, innerWidth } from "svelte/reactivity/window";
	import { mode } from "mode-watcher";

	type Props = {
		enabled?: boolean;
		maxParticles?: number;
		speed?: number;
		class?: ClassValue;
	};

	let { enabled = true, maxParticles = 100, speed = 300, class: className }: Props = $props();

	const snowLightColor = "rgba(0, 0, 0, 0.2)";
	const snowDarkColor = "rgba(255, 255, 255, 0.2)";

	let frame: ReturnType<typeof requestAnimationFrame>;
	let timeout: ReturnType<typeof setTimeout>;

	function startSnow(ctx: CanvasRenderingContext2D, width: number, height: number) {
		const particles: {
			x: number;
			y: number;
			radius: number;
			density: number;
		}[] = [];
		for (let i = 0; i < maxParticles; i++) {
			particles.push({
				x: Math.random() * width,
				y: Math.random() * height,
				radius: 1 + Math.random() * 2,
				density: Math.random() * maxParticles
			});
		}

		// Draw the flakes
		function draw() {
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
		const margin = 50;
		function update() {
			const angle = Date.now() / 3000;
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

	const letItSnow: Attachment<HTMLCanvasElement> = canvas => {
		canvas.width = innerWidth.current ?? 0; // additionally re-runs the attachment on window resize
		canvas.height = innerHeight.current ?? 0;

		const context = canvas.getContext("2d");

		if (context && enabled) {
			startSnow(context, canvas.width, canvas.height);
		}

		return () => {
			clearTimeout(timeout);
			cancelAnimationFrame(frame);
			context?.clearRect(0, 0, canvas.width, canvas.height);
		};
	};
</script>

<canvas aria-hidden="true" {@attach letItSnow} class={className}></canvas>
