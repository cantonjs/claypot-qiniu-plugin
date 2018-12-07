import { startPure } from 'claypot';
import { resolve } from 'path';
import getPort from 'get-port';

let server;

const {
	QINIU_ACCESS_KEY,
	QINIU_SECRET_KEY,
	QINIU_BUCKET,
	QINIU_DOMAIN,
} = process.env;

export async function startServer(pluginConfig, claypotConfig) {
	const port = await getPort();
	const urlRoot = `http://127.0.0.1:${port}`;
	server = await startPure({
		port,
		cwd: resolve('test'),
		execCommand: 'babel-register',
		production: false,
		plugins: [
			{
				module: '../src',
				options: {
					path: '/api/qiniu/uptoken',
					key: QINIU_ACCESS_KEY,
					secret: QINIU_SECRET_KEY,
					bucket: QINIU_BUCKET,
					domain: QINIU_DOMAIN,
					...pluginConfig,
				},
			},
			{
				module: 'claypot-restful-plugin',
				options: {
					controllersPath: 'apis',
					definitionsPath: 'defs',
					info: {
						version: '0.0.1',
					},
					securities: {
						defaults: 'X-ACCESS-TOKEN',
						wechatUser: 'X-ACCESS-TOKEN',
					},
					defaultSecurity: ['defaults'],
					pluralize: true,
				},
			},
		],
		...claypotConfig,
	});
	return {
		port,
		urlRoot,
	};
}

export async function stopServer() {
	if (server) {
		await server.close();
		startServer.server = null;
	}
}
