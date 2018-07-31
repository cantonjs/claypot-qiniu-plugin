import { startPure } from 'claypot';
import { resolve } from 'path';
import getPort from 'get-port';

let server;

export async function startServer(pluginConfig, claypotConfig) {
	const port = await getPort();
	const urlRoot = `http://127.0.0.1:${port}`;
	server = await startPure({
		port,
		cwd: resolve('test'),
		execCommand: 'babel-register',
		production: false,
		plugins: [
			// './middlewares/wechat',
			{
				module: '../src',
				options: {
					path: '/api/qiniu/uptoken',
					key: '<your key>',
					secret: '<your secret>',
					bucket: '<your bucket>',
					domain: '<your domain>',
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
