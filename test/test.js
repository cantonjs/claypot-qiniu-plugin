import { startServer, stopServer } from './utils';
import fetch from 'node-fetch';

describe('claypot qiniu plugin', () => {
	afterEach(stopServer);

	test('should fetch uploadToken api work', async () => {
		const { urlRoot } = await startServer();
		const res = await fetch(`${urlRoot}/api/qiniu/uptoken`, {
			headers: { 'Content-Type': 'application/json' },
		});
		expect(await res.json()).toMatchObject({
			expiresIn: expect.any(Number),
			expiresInUnix: expect.any(Number),
			uptoken: expect.any(String),
		});
	});

	test('should uploadByBas464 work', async () => {
		const { urlRoot } = await startServer();
		const res = await fetch(`${urlRoot}/api/images/base64`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
		});

		const resJSON = await res.json();

		expect(resJSON).toMatchObject({
			url: expect.any(String),
		});
	});

	test('should uploadByBuffer work', async () => {
		const { urlRoot } = await startServer();
		const res = await fetch(`${urlRoot}/api/images/buffer`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
		});

		const resJSON = await res.json();

		expect(resJSON).toMatchObject({
			url: expect.any(String),
		});
	});

	test('should uploadByStream work', async () => {
		const { urlRoot } = await startServer();
		const res = await fetch(`${urlRoot}/api/images/stream`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
		});

		const resJSON = await res.json();

		expect(resJSON).toMatchObject({
			url: expect.any(String),
		});
	});

	test('should uploadByFile work', async () => {
		const { urlRoot } = await startServer();
		const res = await fetch(`${urlRoot}/api/images/file`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
		});

		const resJSON = await res.json();

		expect(resJSON).toMatchObject({
			url: expect.any(String),
		});
	});

	test('should uploadByUrl work', async () => {
		const { urlRoot } = await startServer();

		const res = await fetch(`${urlRoot}/api/images/url`, {
			method: 'POST',
			body: JSON.stringify({
				url:
					'https://ss1.baidu.com/6ONXsjip0QIZ8tyhnq/it/u=1667994205,255365672&fm=5',
			}),
			headers: { 'Content-Type': 'application/json' },
		});

		const resJson = await res.json();
		expect(resJson).toMatchObject({
			url: expect.any(String),
		});
	});
});
