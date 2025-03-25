import { redirect } from "@sveltejs/kit";

export async function load({ parent }) {
	const { displayablePackages } = await parent();
	const firstCategory = displayablePackages[0];
	if (!firstCategory) redirect(307, "/packages");
	const firstPackage = firstCategory.packages[0];
	if (!firstPackage) redirect(307, "/packages");
	redirect(307, `/package/${firstPackage.packageName}`);
}
