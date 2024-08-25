import { dev } from "$app/environment";
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from "$env/static/private";
import { GitHub } from "arctic";
import { type Adapter, type DatabaseSession, type DatabaseUser, Lucia, type UserId } from "lucia";
import { PROD_URL } from "$lib/config";

class EmptyAdapter implements Adapter {
	deleteExpiredSessions(): Promise<void> {
		return Promise.resolve();
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	deleteSession(_sessionId: string): Promise<void> {
		return Promise.resolve();
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	deleteUserSessions(_userId: UserId): Promise<void> {
		return Promise.resolve();
	}

	getSessionAndUser(
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_sessionId: string
	): Promise<[session: DatabaseSession | null, user: DatabaseUser | null]> {
		return Promise.resolve([null, null]);
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	getUserSessions(_userId: UserId): Promise<DatabaseSession[]> {
		return Promise.resolve([]);
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	setSession(_session: DatabaseSession): Promise<void> {
		return Promise.resolve();
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	updateSessionExpiration(_sessionId: string, _expiresAt: Date): Promise<void> {
		return Promise.resolve();
	}
}

const adapter = new EmptyAdapter();

export const lucia = new Lucia(adapter, {
	sessionCookie: {
		attributes: {
			secure: !dev
		}
	}
});

export const github = new GitHub(GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, {
	redirectURI: `${dev ? "http://localhost:5173" : PROD_URL}/login/callback`
});
