<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLAnchorAttributes } from "svelte/elements";
	import { dev } from "$app/environment";

	type Props = {
		attributes: HTMLAnchorAttributes;
		linkChildren?: Snippet<[Snippet]>;
	};

	let { attributes, linkChildren }: Props = $props();
	let { children, ...rest } = $derived(attributes);
	let { href } = $derived(rest);

	// source: https://en.wikipedia.org/wiki/HTML_video#Browser_support
	const videoExtensions = [
		"ogg",
		"ogv",
		"oga",
		"ogx",
		"ogm",
		"spx",
		"mp4",
		"m4a",
		"m4p",
		"m4b",
		"m4r",
		"m4v",
		"webm"
	];
	// source: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img#supported_image_formats
	const imageExtensions = [
		"apng",
		"png",
		"avif",
		"gif",
		"jpg",
		"jpeg",
		"jpe",
		"jif",
		"jfif",
		"svg",
		"webp"
	];
</script>

<!-- Renders -->
{#snippet link()}
	{#snippet original()}
		<a {...rest}>
			{@render children?.()}
		</a>
	{/snippet}
	{#if linkChildren}
		{@render linkChildren(original)}
	{:else}
		{@render original()}
	{/if}
{/snippet}

{#snippet image(alt?: string)}
	<img src={href} alt={alt ?? href?.split("/").pop()} />
{/snippet}

{#snippet video()}
	<video src={href} controls>
		<track kind="captions" />
	</video>
{/snippet}

<!-- Main logic -->
{#if href}
	{@const hasExtension = /\.[a-zA-Z\d]+$/.test(href)}
	{#if hasExtension}
		{@const filename = href.split("/").pop()}
		{@const extension = filename?.split(".").pop() ?? ""}
		{#if videoExtensions.includes(extension)}
			{@render video()}
		{:else if imageExtensions.includes(extension)}
			{@render image(filename)}
		{:else}
			{@render link()}
		{/if}
	{:else if href.startsWith("https://github.com/user-attachments/assets/")}
		<!-- special case for faster responses for known GH URLs -->
		{@render video()}
	{:else if new URL(href).pathname === "/"}
		<!-- we'll assume nothing else than a link can come from a URL without pathname -->
		{@render link()}
	{:else if !dev}
		<!-- fetching the URL's content type (only in prod because CORS) -->
		{#await fetch(href, { method: "HEAD" }) then response}
			{@const contentType = response.headers.get("Content-Type")}
			{#if contentType?.startsWith("video/")}
				{@render video()}
			{:else if contentType?.startsWith("image/")}
				{@render image()}
			{:else}
				{@render link()}
			{/if}
		{:catch}
			{@render link()}
		{/await}
	{:else}
		{@render link()}
	{/if}
{:else}
	{@render link()}
{/if}
