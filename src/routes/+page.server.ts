import { redirect } from "@sveltejs/kit";
import { resolve } from "$app/paths";

export async function load({ parent }) {
	const { displayablePackages } = await parent();
	const firstCategory = displayablePackages[0];
	if (!firstCategory) redirect(307, resolve("/packages"));
	const firstPackage = firstCategory.packages[0];
	if (!firstPackage) redirect(307, resolve("/packages"));
	redirect(307, resolve("/package/[...package]", { package: firstPackage.pkg.name }));
}
