/**
 * A wrapper genrator around `Storage`s to prevent
 * security errors or incorrect schemes.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage#exceptions|MDN}
 */
function safeStorage(store: Storage) {
	return {
		getItem: (key: string, defaultValue: string | null = null): ReturnType<Storage["getItem"]> => {
			try {
				return store.getItem(key);
			} catch {
				// disabled or unavailable
				return defaultValue;
			}
		},

		setItem: (key: string, value: string) => {
			try {
				store.setItem(key, value);
			} catch {
				// disabled or unavailable
			}
		},

		removeItem: (key: string) => {
			try {
				store.removeItem(key);
			} catch {
				// disabled or unavailable
			}
		}
	};
}

/**
 * A utility wrapper around `localStorage` to prevent
 * security errors or incorrect schemes.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage#exceptions|MDN}
 */
export const local = safeStorage(localStorage);
/**
 * A utility wrapper around `sessionStorage` to prevent
 * security errors or incorrect schemes.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage#exceptions|MDN}
 */
export const session = safeStorage(sessionStorage);
