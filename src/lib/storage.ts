/**
 * A wrapper genrator around `Storage`s to prevent
 * security errors or incorrect schemes.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage#exceptions|MDN}
 */
function safeStorage(store: Storage): Storage {
	return {
		get length() {
			try {
				return store.length;
			} catch {
				// disabled or unavailable
				return 0;
			}
		},
		clear: () => {
			try {
				store.clear();
			} catch {
				// disabled or unavailable
			}
		},
		getItem: (key, defaultValue: ReturnType<Storage["getItem"]> = null) => {
			try {
				return store.getItem(key);
			} catch {
				// disabled or unavailable
				return defaultValue;
			}
		},
		key: (index, defaultValue: ReturnType<Storage["key"]> = null) => {
			try {
				return store.key(index);
			} catch {
				// disabled or unavailable
				return defaultValue;
			}
		},
		removeItem: key => {
			try {
				store.removeItem(key);
			} catch {
				// disabled or unavailable
			}
		},
		setItem: (key, value) => {
			try {
				store.setItem(key, value);
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
