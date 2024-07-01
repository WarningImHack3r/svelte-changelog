# svelte-changelog

[svelte-changelog.vercel.app](https://svelte-changelog.vercel.app/)

Made with SvelteKit, TailwindCSS & shadcn-svelte.

## Features

- Gorgeous UI from shadcn/ui
- Includes _all_ NPM packages by the Svelte team that can be used in a project
- Blinking badges to indicate new versions since the last visit
- Dynamically computed badges to indicate whether a package is the Latest, a Major version, a Prerelease, or a Maintenance version
- Hover popups at multiple places across the site
- Optional use of a GitHub token in dev mode to avoid rate limiting

## How does it work?

The site makes requests to the GitHub API on the client side to get the latest releases for all the packages.
As such, the data is fresh from GitHub every time you refresh the page.

Some computations are made to generate the badges, but everything else is a simple cosmetic
wrapper around GitHub releases.
**No data alteration is performed by the site other than for styling and rendering purposes**.

## Missing a package?

If you think I missed a package, you can either open an issue or directly contribute.

### Package inclusion criteria

- Must be by the Svelte team or their members
- Must be on GitHub
- Must _not_ be an internal package used only by the Svelte team
- Must have releases on GitHub

### How to contribute

Fork the repo, edit the `/src/routes/+layout.ts` file, and open a PR.  
**If the repo is not from the `sveltejs` organization, please open an issue instead.**

The code architecture is made to be as flexible as possible, here's how it works:

```typescript
const repos: Record<Tab, { name: string; repos: Repo[] }> = {
    svelte: ...,
    kit: ...,
    others: {
        name: "Other",
        repos: [
            {
                ...
            },
            {
                repoName: "your-repo", // The name of the repo on GitHub, as it appears in the URL: https://github.com/sveltejs/your-repo
                dataFilter: ({ tag_name }) => true, // Optional line, return false to exclude a version from its tag name
                versionFromTag: tag => "..." // Return the version from the tag name; must be a valid semver
            }
        ]
    }
};
```

And that's it! The rest of the site will automatically adapt to the new package(s).
