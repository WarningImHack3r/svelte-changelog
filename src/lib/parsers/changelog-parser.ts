// Gently stolen from https://github.com/fl-client/changelog-parser as this “fixed” version
// is not available on npm.
// Removed the `filePath` option as I don't need it, bring in the types and fix the linting errors.

const EOL = "\n";

// patterns
const semver = /\[?v?([\w.-]+\.[\w.-]+[a-zA-Z0-9])]?/;
const date = /.* \(?(\d\d?\d?\d?[-/.]\d\d?[-/.]\d\d?\d?\d?)\)?.*/;
const subhead = /^###/;
const listItem = /^[*-]/;

type Changelog = {
	title: string;
	description: string;
	versions: {
		version: string | null;
		title: string;
		date: string | null;
		body: string;
		parsed: Record<string, string[]>;
	}[];
};

type PrivateVersion = Changelog["versions"][number] & {
	_private?: {
		activeSubhead: string | null;
	};
};

type ProcessingData = {
	log: Changelog;
	current: PrivateVersion | null;
};

/**
 * Changelog parser.
 *
 * @param text changelog text
 * @param callback optional callback
 * @returns parsed changelog object
 */
export default function parseChangelog(
	text: string,
	callback?: (error: string | null, result?: Changelog) => void
): Promise<Changelog> {
	const changelog = parse(text);

	if (typeof callback === "function") {
		changelog.then(log => callback(null, log)).catch((err: string) => callback(err));
	}

	// otherwise, invoke callback
	return changelog;
}

/**
 * Internal parsing logic.
 *
 * @param text the changelog text
 * @returns the parsed changelog object
 */
function parse(text: string): Promise<Changelog> {
	let data: ReturnType<typeof handleLine> = {
		log: {
			title: "",
			description: "",
			versions: []
		},
		current: null
	};

	return new Promise(resolve => {
		function done() {
			// push last version into log
			if (data.current) {
				pushCurrent(data);
			}

			// clean up description
			data.log.description = clean(data.log.description);

			resolve(data.log);
		}

		if (text) {
			text.split(/\r\n?|\n/gm).forEach(line => (data = handleLine(line, data)));
			done();
		}
	});
}

/**
 * Handles each line and mutates the data object (bound to `this`) as needed.
 *
 * @param line line from the changelog file
 * @param data the current processing data
 */
function handleLine(line: string, data: ProcessingData): ProcessingData {
	// skip line if it's a link label
	if (RegExp(/^\[[^[\]]*] *?:/).exec(line)) return data;

	// set the title if it's there
	if (!data.log.title && RegExp(/^# ?[^#]/).exec(line)) {
		data.log.title = line.substring(1).trim();
		return data;
	}

	// new version found!
	if (RegExp(/^##? ?[^#]/).exec(line)) {
		if (data.current?.title) pushCurrent(data);

		data.current = versionFactory();

		if (semver.exec(line)) data.current.version = semver.exec(line)?.at(1) ?? null;

		data.current.title = line.substring(2).trim();

		if (data.current.title && date.exec(data.current.title))
			data.current.date = date.exec(data.current.title)?.at(1) ?? null;

		return data;
	}

	// deal with body or description content
	if (data.current) {
		data.current.body += line + EOL;

		// handle case where current line is a 'subhead':
		// - 'handleize' subhead.
		// - add subhead to 'parsed' data if not already present.
		if (subhead.exec(line)) {
			const key = line.replace("###", "").trim();

			if (!data.current.parsed[key]) {
				data.current.parsed[key] = [];
				data.current._private ||= { activeSubhead: key };
			}
		}

		// handle case where current line is a 'list item':
		if (listItem.exec(line)) {
			// add line to 'catch all' array
			data.current.parsed._?.push(line);

			// add line to 'active subhead' if applicable (eg. 'Added', 'Changed', etc.)
			if (data.current._private?.activeSubhead) {
				data.current.parsed[data.current._private.activeSubhead]?.push(line);
			}
		}
	} else {
		data.log.description = (data.log.description || "") + line + EOL;
	}

	return data;
}

function versionFactory(): PrivateVersion {
	return {
		version: null,
		title: "",
		date: null,
		body: "",
		parsed: {
			_: []
		},
		_private: {
			activeSubhead: null
		}
	};
}

function pushCurrent(data: ProcessingData) {
	if (!data.current) return;
	// remove private properties
	delete data.current._private;

	data.current.body = clean(data.current.body);
	data.log.versions.push(data.current);
}

function clean(str: string) {
	if (!str) return "";

	return (
		str
			// trim
			.trim()
			// remove leading newlines
			.replace(new RegExp("[" + EOL + "]*"), "")
			// remove trailing newlines
			.replace(new RegExp("[" + EOL + "]*$"), "")
	);
}
