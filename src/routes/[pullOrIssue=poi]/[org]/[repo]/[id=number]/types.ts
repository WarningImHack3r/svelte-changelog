import type { Octokit } from "octokit";

export type LinkedEntity = {
	createdAt: string;
	author: {
		login: string;
		avatarUrl: string;
	};
	number: number;
	body: string;
	title: string;
};

export type Issues = InstanceType<typeof Octokit>["rest"]["issues"];
export type Pulls = InstanceType<typeof Octokit>["rest"]["pulls"];
