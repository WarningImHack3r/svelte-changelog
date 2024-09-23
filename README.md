# svelte-changelog

[svelte-changelog.vercel.app](https://svelte-changelog.vercel.app/)

Made with SvelteKit, TailwindCSS & shadcn-svelte.

## Features

- Gorgeous UI from shadcn/ui
- Includes _all_ NPM packages by the Svelte team that can be used in a project
- Stunning page embedding all details of a pull request/issue
- Blinking badges to indicate new versions since the last visit
- Dynamically computed badges to indicate whether a package is the Latest, a Major version, a Prerelease, or a Maintenance version
- Hover popups at multiple places across the site
- "What's new" banner to keep users updated about the latest changes to the website
- Authenticate with GitHub to bypass rate limits and get access to more features
- Optional use of a GitHub token to avoid rate limiting in dev mode in a `.env` file (see `.env.example`)

## How does it work?

The site makes requests to the GitHub API on the client side to get the latest releases for all the packages.
As such, the data is fresh from GitHub every time you refresh the page.

Some computations are made to generate the badges, but everything else is a simple cosmetic
wrapper around GitHub releases.
**No data alteration is performed by the site other than for styling and rendering purposes**.

### What is that "Log in with GitHub" button?

With the growing amount of features and supported packages, the site went from requesting the GitHub API
very few times to request it a lot.  
As such, the rate limit of the GitHub API was quickly reached, and the site became hard to browse.

To solve this issue, I [initially implemented](https://github.com/WarningImHack3r/svelte-changelog/commit/f28218cbf3d57d509e771520e8c02a610dab4b95) a way to input a GitHub token in the website settings.
This became [the next week](https://github.com/WarningImHack3r/svelte-changelog/pull/27) a full-fledged authentication system with GitHub OAuth, which is what you see today.

**By logging in with GitHub, you can browse the site (almost) without any rate limit issues**.
You will also get access to more features, such as the ability to see the details of a pull request
or issue directly on the site.

The site does not store any data about you. The only thing the login system does is store the token given
by the GitHub authentication process in the browser's local storage to use it for the GitHub API requests.

Logging in is entirely optional but highly recommended. You can remove the token from the website at any time
by clicking the "Log out" button in your avatar dropdown.

## Missing a package?

If you think I missed a package, you can either open an issue or directly contribute.

### Package inclusion criteria

- Must be by the Svelte team or their members
- Must be on GitHub
- Must _not_ be an internal package used only by the Svelte team
- Must either have releases on GitHub or at least have tags and a `CHANGELOG.md` file at the root of the repository

### How to contribute

Fork the repo, edit the `/src/routes/+layout.ts` file, and open a PR.  
**If the repo is not in the `sveltejs` GitHub organization, please open an issue instead.**

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
                changesMode: "releases", // Optional line, the way to get the changes; either "releases" or "changelog", defaults to "releases"
                repoName: "your-repo", // The name of the repo on GitHub, as it appears in the URL: https://github.com/sveltejs/your-repo
                dataFilter: ({ tag_name }) => true, // Optional line, return false to exclude a version from its tag name
                versionFromTag: tag => "...", // Return the version from the tag name; must be a valid semver
                changelogContentsReplacer: contents => contents, // Optional line, replace the contents of the changelog file before parsing it; only used if `changesMode` is "changelog"
            }
        ]
    }
};
```

And that's it! The site will automatically adapt to the new package(s).
