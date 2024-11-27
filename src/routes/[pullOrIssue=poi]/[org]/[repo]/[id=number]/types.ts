import type { Octokit } from "octokit";
import type { Issue } from "@octokit/graphql-schema";

export type LinkedEntity = Issue | Awaited<ReturnType<Pulls["get"]>>["data"];

export type Issues = InstanceType<typeof Octokit>["rest"]["issues"];
export type Pulls = InstanceType<typeof Octokit>["rest"]["pulls"];
