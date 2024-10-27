import type { Octokit } from "octokit";

export type Issues = InstanceType<typeof Octokit>["rest"]["issues"];
export type Pulls = InstanceType<typeof Octokit>["rest"]["pulls"];
