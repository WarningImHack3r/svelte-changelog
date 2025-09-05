<script lang="ts">
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
</script>

<h5 class="-mt-8 text-muted-foreground">
	{new Intl.DateTimeFormat("en", {
		dateStyle: "long"
	}).format(new Date("2025-04-11"))} • Antoine Lethimonnier
</h5>

<p>
	<strong>Svelte Changelog v2 is here!</strong>
	With a new, faster backend, a new domain and a design refresh, here's a quick tour of what's changed
	in this new iteration.
</p>

<h2>The road to today</h2>

<p>
	More than a year ago now, I started this project after watching <a
		href="https://www.youtube.com/@SvelteSociety/streams"
	>
		This Week in Svelte
	</a>, because I saw a need in the "old way" of browsing the releases: directly and manually
	through GitHub. This site was born in an afternoon.<br />Since then, it has become
	<a href="https://github.com/WarningImHack3r?tab=repositories&type=source&sort=stargazers">
		my most starred GitHub repository
	</a>, and has been featured <strong>every week</strong> in TWIS. I can't be more grateful for all this.
</p>

<p>
	Since then, it's got a few evolutions like <a
		href="https://twitter.com/PaoloRicciuti/status/1814402700794310677"
	>
		the details page
	</a>, a
	<a href="https://twitter.com/probably_coding/status/1814394782481035526">syntax highlighter</a>,
	and
	<a href="https://twitter.com/probably_coding/status/1828201003260486051">a login mechanism</a>. It
	came as I thought about it, but also from live feedbacks (and bugs) reported from TWIS.
</p>

<p>
	But as new features and notable migrations were introduced, I started realizing the mess of a
	codebase it was starting to become. <a href="https://ricciuti.me">Paolo</a> (TWIS host) himself also
	said the old "Others" tab was unreadable (and I thank him for his feedback!).
</p>

<p>
	All of this indicated it was <a href="https://bsky.app/profile/antleth.fr/post/3lco2v2awqk2i">
		time for a change
	</a>. So, with a bit of prototyping and help from
	<a href="https://www.thomasglopes.com">Thomas</a> (<a href="https://melt-ui.com">Melt UI</a>
	creator) and 3 weeks of work in the middle of moving to a new flat, <strong>here we are</strong>.
</p>

<h2>What's new</h2>

<p>
	As you may guess now, my goals were the following: a codebase easier to maintain, a clearer and
	cleaner website, packed of course with long-awaited features.
</p>

<p>
	More than an upgrade, <strong>Svelte Changelog v2 features a brand new paradigm</strong>. No more
	client auth, no more forever-spinning loadings: it now just works, and it works <em>fast</em>.
</p>

<p>
	I rewrote almost everything from scratch, moving from a bring-your-own-token client-only paradigm
	to a brand new server-side data fetching layer.
	<br />
	Under the hood, I now use a dedicated Redis instance, hosted on
	<a href="https://upstash.com/docs/redis/overall/getstarted">Upstash</a>. Thanks to a granular
	cache TTL, data fetched with my token on the server is automatically purged and re-fetched
	periodically.
</p>

<p>
	The UI also got a design refresh, vibing more with <a href="https://svelte.dev">
		the new Svelte site
	</a>. Alongside new fonts and updated colors, the site now uses modernized components, still based
	on
	<a href="https://shadcn-svelte.com">shadcn/ui</a>.
	<br />
	The routing has also been revamped, now featuring <strong>a page per package</strong> as well as a
	sidebar for a better packages overview and an eased navigation.
</p>

<p>All that now lives under a brand new domain, <a href={resolve("/")}>{page.url.host}</a>.</p>

<p>
	This version truly is the beginning of a new era for this site, unlocking many possibilities
	whilst being way more pleasant to browse.
</p>

<h2>The roadmap</h2>

<p>This refresh sets the bar for a ton of other improvements I'd like to bring:</p>

<ul>
	<li>
		<strong>A global search</strong> based on <a href="https://typesense.org">TypeSense</a>,
		allowing to search for packages or even release details
	</li>
	<li>
		<strong>More filters</strong> to allow you to customize even more what's shown on your releases
		page (cc <a href="https://github.com/WarningImHack3r/svelte-changelog/issues/45">Thomas</a>!)
	</li>
	<li>
		<strong>Infinite loading</strong> to be able to load as many releases as desired, leveraging the
		new data fetching layer
	</li>
	<li><strong>A dashboard</strong>, using graphs to show stats about releases and more</li>
	<li><strong>Even more frequent updates</strong> thanks to a revised notification system</li>
	<li>
		and even more! Check the <a href="https://github.com/WarningImHack3r/svelte-changelog/issues">
			open issues
		</a> for sneak peeks ;)
	</li>
</ul>

<h2>Thank <em>you</em></h2>

<p>
	I really hope you'll like everything I put into this release!
	<br />
	As always, I'm open to feedbacks and contributions, visit
	<a href="https://github.com/WarningImHack3r/svelte-changelog">the repo</a>!
</p>

<p>
	Many thanks to <strong>Paolo</strong> for your key role in TWIS and the community,
	<strong>Thomas</strong> for your help and kindness, the whole <strong>Svelte Community</strong>
	for being so great, the <strong>Svelte team</strong> for bringing us such amazing pieces of
	software, and <strong>thank you to everyone supporting me</strong> and enjoying this site and my projects!
</p>

<div class="mt-12 text-muted-foreground">~ Antoine</div>
