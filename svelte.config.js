import adapter from '@sveltejs/adapter-auto';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		alias: {
			$utils: "./src/lib/utils",
		},
		csrf: {
			checkOrigin: false
		}
	},
};

export default config;
