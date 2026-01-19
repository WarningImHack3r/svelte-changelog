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
- ...and much more!

## How does it work?

The site makes requests to the GitHub API on the server side to get the latest releases for all the packages.
It smartly caches the data, frequently invalidating it to always be up to date while avoiding hitting GitHub as
much as possible.

Whilst the repos are [manually curated](#how-to-contribute), the packages are automatically discovered, either
through the published releases or the contents of the `CHANGELOG.md` file.

Some computations are made to generate the badges, but everything else is a simple cosmetic
wrapper around GitHub releases.
**No data alteration is performed by the site other than for styling and rendering purposes**.

For more info, visit the [v2 release post](https://svelte-changelog.dev/devlog/v2).

### Run locally

```sh
# 1. Copy the example environment file
cp .env.example .env

# 2. Edit .env and add your GitHub token:
#    GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# 3. Install dependencies and run
pnpm i && pnpm dev
```

That's it: your GitHub token will do most of the job, and you can run the website like any regular SvelteKit app.

#### Environment Variables

- `GITHUB_TOKEN`: a [classic GitHub token](https://github.com/settings/tokens) with the `public_repo` scope (that's it), required for API requests.
- `KV_REST_API_TOKEN` (optional): the token for the API of the KV service (Redis). You can leave it empty; an in-memory cache is used during development.
- `KV_REST_API_URL` (optional): the URL for the API of the KV service (Redis). You can leave it empty; an in-memory cache is used during development.
- `PUBLIC_POSTHOG_KEY` (optional): the token for the analytics service I use, [PostHog](https://posthog.com). You can leave it empty; analytics are disabled in dev environments.

## Missing a repository?

If you think I missed a repository, you can either open an issue or directly contribute.

### Repository inclusion criteria

- Must be by the Svelte team or their members
- Must be on GitHub
- Must _not_ be an internal repo/package used only by the Svelte team
- Must either have releases on GitHub or at least have tags and a `CHANGELOG.md` file at the root of the repository

### How to contribute

Fork the repo, edit the [`src/lib/repositories.ts`](src/lib/repositories.ts) file, and open a PR.
The site's code has been architectured to be as flexible as possible, here's how it works:

```typescript
const repos = {
    svelte: {/* ... */},
    kit: {/* ... */},
    tools: {
        name: "Tooling",
        description: "...",
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

Add your repo where you see fit (tools or libs), and that's it! The site will automatically discover & adapt to the new package(s).
