import fs from 'fs';

export default class Images {
	async uploadByBase64({ body }) {
		const base64 = fs.readFileSync('./test/images/cat.png', 'base64');
		return this.$qiniu.uploadByBase64(base64);
	}

	async uploadByBuffer({ body }) {
		const buffer = fs.readFileSync('./test/images/cat.png');
		return this.$qiniu.uploadByBuffer(buffer);
	}

	async uploadByStream() {
		const stream = fs.createReadStream('./test/images/cat.png');
		return this.$qiniu.uploadByStream(stream);
	}

	async uploadByFile() {
		return this.$qiniu.uploadByFile('./test/images/cat.png');
	}

	async uploadByUrl({ body }) {
		const { url } = body;
		return this.$qiniu.uplaodByUrl(url);
	}
}
