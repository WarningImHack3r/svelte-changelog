/**
 * @see {@link https://github.com/TheDevMinerTV/npm_replicator/blob/main/pkg/webhooks/events.go|Equivalent Go types}
 */
export type ReplicatorEvent = {
	event: "metadata_updated" | "changestream_updated";
	/**
	 * Timestamp in seconds (10 digits)
	 */
	timestamp: number;
	package: {
		name: string;
		keywords?: string[];
		repository?: {
			type: string;
			url: string;
		};
		version: string;
		author?: { name: string; email?: string } | string;
		maintainers?: ({ name: string; email?: string } | string)[];
		contributors?: ({ name: string; email?: string } | string)[];
    dist: {
      /**
       * The npm registry tarball URL
       * 
       * @example https://registry.npmjs.org/svelte/-/svelte-5.48.0.tgz
       */
			tarball: string;
			fileCount?: number;
			unpackedSize?: number;
		};
		dependencies?: Record<string, string>;
		devDependencies?: Record<string, string>;
		engines?: { name: string; version: string }[] | string | string[] | Record<string, string>;
		_rev?: string;
		replicator: {
			upstreamRev: string;
			metadataRev: string | null;
			/**
			 * RFC 3339 date
			 */
			downloadsLastUpdated: string | null;
			foundInChangestreamButNotInRegistry: boolean;
			hasJSONParseError: boolean;
			hasInvalidTag: boolean;
		};
	};
};
