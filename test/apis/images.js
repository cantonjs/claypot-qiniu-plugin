export default {
	'/base64': {
		post: {
			summary: 'upload by base64',
			security: [],
			operator: 'uploadByBase64',
		},
	},
	'/buffer': {
		post: {
			summary: 'upload by buffer',
			security: [],
			operator: 'uploadByBuffer',
		},
	},
	'/url': {
		post: {
			summary: 'upload by url',
			security: [],
			params: {
				body: {
					schema: {
						type: 'object',
						properties: {
							url: { type: 'string' },
						},
						required: ['url'],
					},
				},
			},
			operator: 'uploadByUrl',
		},
	},
};
