import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	theme: {
		container: {
			center: true,
			padding: "2rem"
		},
		extend: {
			typography: {
				DEFAULT: {
					css: {
						a: {
							color: 'theme("colors.primary.DEFAULT")'
						}
					}
				}
			},
			keyframes: {
				"accordion-down": {
					from: { height: "0" },
					to: { height: "var(--bits-accordion-content-height)" }
				},
				"accordion-up": {
					from: { height: "var(--bits-accordion-content-height)" },
					to: { height: "0" }
				},
				"caret-blink": {
					"0%,70%,100%": { opacity: "1" },
					"20%,50%": { opacity: "0" }
				}
			},
			animation: {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
				"caret-blink": "caret-blink 1.25s ease-out infinite"
			}
		}
	},
	plugins: [typography, tailwindcssAnimate]
} satisfies Config;
