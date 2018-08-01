import { ensureLogger, createApp } from 'claypot';
import qiniu from 'qiniu';
import rp from 'request-promise-native';

const isQiniuCallback = (mac, requestURI, reqBody, callbackAuth) => {
	const auth = exports.generateAccessToken(mac, requestURI, reqBody);
	return auth === callbackAuth;
};

const logger = ensureLogger('qiniu', 'blueBright');

const QINIU_BASE64_PATH = 'putb64/-1';

const zones = {

	// 华东
	z0: {
		host: 'up.qiniup.com/',
		sdk: 'Zone_z0',
	},

	// 华北
	z1: {
		host: 'up-z1.qiniup.com/',
		sdk: 'Zone_z1',
	},

	// 华南
	z2: {
		host: 'up-z2.qiniup.com/',
		sdk: 'Zone_z2',
	},

	// 北美
	na0: {
		host: 'up-na0.qiniup.com/',
		sdk: 'Zone_na0',
	},

	// 东南亚
	as0: {
		host: 'up-as0.qiniup.com/',
		sdk: 'Zone_as0',
	},
};

export default class QiniuClaypotPlugin {
	constructor(options = {}) {
		const {
			path,
			key,
			secret,
			bucket,
			zone = 'z0',
			useHttpsDomain,
			useCdnDomain,
			expiresIn = 36000000,
			namespace = 'qiniu',
			domain,
			includes = [],
			excludes = [],
			store,
		} = options;

		if (!domain) {
			throw new Error('[claypot-qiniu-plugin] domain is necessary');
		}

		if (!zones[zone]) {
			throw new Error('[claypot-qiniu-plugin] zone should be one of [z0, z1, z2, na0, as0]');
		}

		this._path = path;
		this._expiresIn = expiresIn;
		this._expiresInUnix = expiresIn / 1000;
		this._namespace = namespace;
		this._useHttpsDomain = useHttpsDomain;
		this._zone = zone;
		this._domain = domain;
		this._bucket = bucket;
		this._includes = includes;
		this._excludes = excludes;
		this._storeKey = store;

		const config = new qiniu.conf.Config();

		config.zone = qiniu.zone[zones[zone].sdk];

		if (useHttpsDomain) {
			config.useHttpsDomain = useHttpsDomain;
		}

		if (useCdnDomain) {
			config.useCdnDomain = useCdnDomain;
		}

		qiniu.conf.ACCESS_KEY = key;
		qiniu.conf.SECRET_KEY = secret;


		this._mac = new qiniu.auth.digest.Mac(key, secret);
		this._bucketManager = new qiniu.rs.BucketManager(this._mac, config);

		this._putPolicy = new qiniu.rs.PutPolicy({
			scope: bucket,
			expires: this._expiresInUnix,
		});

		this._qiniu = qiniu;
		this._qiniuConfig = config;
	}

	_getUptoken() {
		const { _putPolicy, _expiresIn, _expiresInUnix, _mac } = this;
		return {
			uptoken: _putPolicy.uploadToken(_mac),
			expiresIn: _expiresIn,
			expiresInUnix: _expiresInUnix,
		};
	}

	_createExtension() {
		const { _bucketManager, _bucket, _domain } = this;

		const uploadByBase64 = async (base64) => {
			const { uptoken } = this._getUptoken();

			const protocol = this._useHttpsDomain ? 'https://' : 'http://';
			const res = await rp({
				uri: protocol + zones[this._zone].host + QINIU_BASE64_PATH,
				headers: {
					Authorization: `UpToken ${uptoken}`,
				},
				body: base64,
				simple: true,
				method: 'POST',
			})
				.then((data) => {
					if (data && data.code) {
						const error = new Error(data.message);
						error.code = data.code;
						logger.error('[claypot-qiniu-plugin] qiniu base64 upload error: ', data.message);
						throw error;
					}
					return JSON.parse(data);
				});
			return { url: _domain + res.key, ...res };
		};

		const uplaodByUrl = (sourceUrl) => {
			return new Promise((resolve, reject) => {
				_bucketManager.fetch(sourceUrl, _bucket, null, (err, respBody) => {
					if (err) {
						logger.error(`[claypot-qiniu-plugin] qiniu fetch ${sourceUrl} error:`, err.code);
						reject(err);
					}
					else {
						const { error } = respBody;
						if (error) {
							logger.error(`[claypot-qiniu-plugin] qiniu fetch ${sourceUrl} error:`, error);
							reject(error);
						}
						else {
							resolve({
								...respBody,
								sourceUrl,
								url: `${_domain}/${respBody.key}`,
							});
						}
					}
				});
			});

		};

		return {
			uploadByBase64,
			uplaodByUrl,
			uploadByBuffer: async (data) => {
				const buffer = Buffer.from(data);
				const base64 = buffer.toString('base64');
				return uploadByBase64(base64);
			},
			uploadByStream: (data) => {
				const { _qiniuConfig, _domain, _qiniu } = this;
				const { uptoken } = this._getUptoken();
				const formUploader = new _qiniu.form_up.FormUploader(_qiniuConfig);
				const putExtra = new _qiniu.form_up.PutExtra();
				return new Promise((resolve, reject) => {
					formUploader.putStream(uptoken, null, data, putExtra, function (respErr, respBody, respInfo) {
						if (respErr) {
							logger.error('[claypot-qiniu-plugin] uploadByStream error: ', respErr);
							throw respErr;
						}
						if (respInfo.statusCode === 200) {
							resolve({ url: _domain + respInfo.key, ...respInfo });
						} else {
							logger.error('[claypot-qiniu-plugin] uploadByStream error: ', respBody);
							reject(respBody);
						}
					});
				});
			},
			uploadByFile: (filePath, name, isUseResume) => {
				const { _qiniu, _domain, _qiniuConfig } = this;
				const { uptoken } = this._getUptoken();
				const putExtra = new _qiniu.form_up.PutExtra();
				const Uploader = isUseResume ? _qiniu.resume_up.ResumeUploader : _qiniu.form_up.FormUploader;
				const uploader = new Uploader(_qiniuConfig);

				if (isUseResume) {
					const fname = name || filePath;

					// 扩展参数
					putExtra.params = {
						'x:name': fname,
						'x:age': 27,
					};

					putExtra.fname = fname;

					// 如果指定了断点记录文件，那么下次会从指定的该文件尝试读取上次上传的进度，以实现断点续传
					putExtra.resumeRecordFile = `${fname}_progress.log`;
				}

				return new Promise((resolve, reject) => {
					uploader.putFile(uptoken, null, filePath, putExtra, function (respErr, respBody, respInfo) {
						if (respErr) {
							logger.error('[claypot-qiniu-plugin] uploadByFile error: ', respErr);
							throw respErr;
						}
						if (respInfo.statusCode === 200) {
							resolve({ url: _domain + respInfo.key, ...respInfo });
						} else {
							logger.error('[claypot-qiniu-plugin] uploadByFile error: ', respBody);
							reject(respBody);
						}
					});
				});
			},
		};
	}

	willCreateModels(modelsMap) {
		const includes = this._includes;
		const excludes = this._excludes;
		for (const [name, Model] of modelsMap) {
			const shouldNotInclude = includes.length && !includes.includes(name);
			if (shouldNotInclude || excludes.includes(name)) continue;
			Model[this._namespace] = this._createExtension();
		}
	}

	middleware(parent) {
		const { _path } = this;

		if (!_path) { return; }

		const app = createApp();
		app.use(async (ctx) => {
			const res = this._getUptoken();
			ctx.body = res;
		});
		parent.mount(_path, app);
	}
}
