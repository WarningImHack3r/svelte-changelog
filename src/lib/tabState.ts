import { writable } from "svelte/store";
import type { Tab } from "../types";

export const tabState = writable<Tab>("svelte");
