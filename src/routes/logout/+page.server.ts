import { fail, redirect } from "@sveltejs/kit";
import { lucia } from "$lib/server/auth";

export const actions = {
	default: async ({ cookies, locals, url }) => {
		if (!locals.session) {
			return fail(401);
		}
		await lucia.invalidateSession(locals.session.id);
		const sessionCookie = lucia.createBlankSessionCookie();
		cookies.set(sessionCookie.name, sessionCookie.value, {
			path: ".",
			...sessionCookie.attributes
		});
		redirect(302, url); // reload the page
	}
};
