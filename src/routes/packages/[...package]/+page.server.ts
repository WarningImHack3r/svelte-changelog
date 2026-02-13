import { redirect } from "@sveltejs/kit";
import { resolve } from "$app/paths";

export function load({ params }) {
	redirect(308, resolve("/package/[...package]", params));
}
