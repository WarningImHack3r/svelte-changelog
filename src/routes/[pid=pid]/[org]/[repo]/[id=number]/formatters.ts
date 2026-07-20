import { siteLang } from "$lib/properties";

export const dateTimeFormatter = new Intl.DateTimeFormat(siteLang, {
	dateStyle: "medium",
	timeStyle: "short"
});

type UserRepo = { user: string; repo: string };
/**
 * Formats the relative link depending on the current repo,
 * the target one, and the target id.
 *
 * @param currentRepo the repository of the current page
 * @param externalRepo the repository of the target link
 * @param externalNumber the id of the target entity
 * @returns the properly formatted link
 */
export function externalEntityLink(
	currentRepo: UserRepo,
	externalRepo: UserRepo,
	externalNumber: number
) {
	if (currentRepo.user === externalRepo.user) {
		return currentRepo.repo === externalRepo.repo
			? `#${externalNumber}`
			: `${externalRepo.repo}#${externalNumber}`;
	}
	return `${externalRepo.user}/${externalRepo.repo}#${externalNumber}`;
}
