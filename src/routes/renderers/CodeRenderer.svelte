<script lang="ts">
	/**
	 * The raw markdown string.
	 */
	export let raw: string;
	/**
	 * The content of the code tag.
	 */
	export let text: string;
</script>

<code class="relative rounded bg-muted px-[0.3rem] py-[0.1rem] font-mono text-sm font-semibold">
	{text}
</code>
