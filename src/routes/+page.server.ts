import { redirect } from "@sveltejs/kit";
import { resolve } from "$app/paths";
import { getDisplayablePackages } from "./packages.remote";

export async function load() {
	const displayablePackages = await getDisplayablePackages();
	const firstCategory = displayablePackages[0];
	if (!firstCategory) redirect(307, resolve("/packages"));
	const firstPackage = firstCategory.packages[0];
	if (!firstPackage) redirect(307, resolve("/packages"));
	redirect(307, resolve("/package/[...package]", { package: firstPackage.pkg.name }));
}
