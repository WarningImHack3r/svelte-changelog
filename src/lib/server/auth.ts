import { dev } from "$app/environment";
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from "$env/static/private";
import { GitHub } from "arctic";
import { PROD_URL } from "$lib/config";

export const github = new GitHub(GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, {
	redirectURI: `${dev ? "http://localhost:5173" : PROD_URL}/login/callback`
});
