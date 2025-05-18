# svelte-changelog

[svelte-changelog.dev](https://svelte-changelog.dev)

Made with SvelteKit, TailwindCSS & shadcn-svelte.

## Features

- Gorgeous UI from shadcn/ui
- Includes _all_ NPM packages by the Svelte team that can be used in a project
- Track the relevant repos' PRs, issues, and discussions
- Stunning page embedding all details of a pull request/issue/discussion
- RSS feeds for all packages
- Dynamically computed badges to indicate whether a package is the Latest, a Major version, a Prerelease, or a Maintenance version
- Sidebar with the number of unseen releases for each package
- ...and more!

## How does it work?

The site makes requests to the GitHub API on the server side to get the latest releases for all the packages.
It smartly caches the data, frequently invalidating it to always be up to date while avoiding hitting GitHub as
much as possible.

Some computations are made to generate the badges, but everything else is a simple cosmetic
wrapper around GitHub releases.
**No data alteration is performed by the site other than for styling and rendering purposes**.

For more info, visit the [v2 release blog](https://svelte-changelog.dev/blog/v2).

## Missing a package?

If you think I missed a package, you can either open an issue or directly contribute.

### Package inclusion criteria

- Must be by the Svelte team or their members
- Must be on GitHub
- Must _not_ be an internal package used only by the Svelte team
- Must either have releases on GitHub or at least have tags and a `CHANGELOG.md` file at the root of the repository

### How to contribute

Fork the repo, edit the [`src/lib/repositories.ts`](src/lib/repositories.ts) file, and open a PR.
The site's code has been architectured to be as flexible as possible, here's how it works:

```typescript
const repos = {
    svelte: {/* ... */},
    kit: {/* ... */},
    others: {
        name: "Other",
        repos: [
            {
                ...
            },
            {
                changesMode: "releases", // Optional line, the way to get the changes; either "releases" or "changelog", defaults to "releases"
                repoOwner: "your-owner", // Optional line, the name of the owner on GitHub, defaults to "sveltejs"
                repoName: "your-repo", // The name of the repo on GitHub, as it is shown in the URL: https://github.com/sveltejs/your-repo
                dataFilter: ({ tag_name }) => true, // Optional line, return false to exclude a version from its tag name
                metadataFromTag: tag => ["package-name", "2.4.3"], // Return the package name and version from the tag name
                changelogContentsReplacer: contents => contents, // Optional line, replace the contents of the changelog file before parsing it; only used if `changesMode` is "changelog"
            }
        ]
    }
};
```

And that's it! The site will automatically adapt to the new package(s).
