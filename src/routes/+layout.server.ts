export function load({ locals }) {
	return {
		username: locals.user?.username
	};
}
