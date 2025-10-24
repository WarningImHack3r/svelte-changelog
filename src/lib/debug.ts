import { dev } from "$app/environment";

const DEBUG = false;

export function dlog(message?: unknown, ...optionalParams: unknown[]) {
	if (DEBUG) console.log(message, ...optionalParams);
}

export function dwarn(message?: unknown, ...optionalParams: unknown[]) {
	if (dev || DEBUG) console.warn(message, ...optionalParams);
}

export function derror(message?: unknown, ...optionalParams: unknown[]) {
	if (dev || DEBUG) console.error(message, ...optionalParams);
}

export function ddebug(message?: unknown, ...optionalParams: unknown[]) {
	if (DEBUG) console.debug(message, ...optionalParams);
}

export function dclear() {
	if (DEBUG) console.clear();
}

export function dassert(condition?: boolean, ...data: unknown[]) {
	if (dev || DEBUG) console.assert(condition, ...data);
}

export function dcount(label?: string) {
	if (DEBUG) console.count(label);
}

export function dcountReset(label?: string) {
	if (DEBUG) console.countReset(label);
}

export function ddir(item?: unknown, options?: unknown) {
	if (DEBUG) console.dir(item, options);
}

export function ddirxml(...data: unknown[]) {
	if (DEBUG) console.dirxml(...data);
}

export function dgroup(...label: unknown[]) {
	if (DEBUG) console.group(...label);
}

export function dgroupEnd() {
	if (DEBUG) console.groupEnd();
}

export function dprofile(label?: string) {
	if (DEBUG) console.profile(label);
}

export function dprofileEnd(label?: string) {
	if (DEBUG) console.profileEnd(label);
}

export function dtable(tabularData?: unknown, properties?: string[]) {
	if (DEBUG) console.table(tabularData, properties);
}

export function dtime(label?: string) {
	if (DEBUG) console.time(label);
}

export function dtimeEnd(label?: string) {
	if (DEBUG) console.timeEnd(label);
}

export function dtimeLog(label?: string, ...data: unknown[]) {
	if (DEBUG) console.timeLog(label, ...data);
}

export function dtimeStamp(label?: string) {
	if (DEBUG) console.timeStamp(label);
}

export function dtrace(message?: unknown, ...optionalParams: unknown[]) {
	if (DEBUG) console.trace(message, ...optionalParams);
}
