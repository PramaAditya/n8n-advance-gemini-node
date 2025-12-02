import { INodeProperties } from 'n8n-workflow';

export const generateImageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Generate Image',
				value: 'generateImage',
				description: 'Generate text and images using Gemini models',
				// eslint-disable-next-line n8n-nodes-base/node-param-operation-option-action-miscased
				action: 'Generate image with Nano Banana',
			},
		],
		default: 'generateImage',
	},
];

export const generateImageFields: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'model',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['generateImage'],
			},
		},
		options: [
			{
				name: 'Nano Banana (2.5 Flash Image Preview)',
				value: 'gemini-2.5-flash-image-preview',
				description: 'Latest model with image generation capabilities',
			},
			{
				name: 'Nano Banana Pro (3 Pro Image Preview)',
				value: 'gemini-3-pro-image-preview',
				description: 'Advanced image generation model with perfect text rendering - excellent for educational illustrations',
			}
		],
		default: 'gemini-2.5-flash-image-preview',
	},
	{
		displayName: 'Message History',
		name: 'messageHistory',
		type: 'fixedCollection',
		displayOptions: {
			show: {
				operation: ['generateImage'],
			},
		},
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		options: [
			{
				name: 'messages',
				displayName: 'Messages',
				values: [
					{
						displayName: 'Content Type',
						name: 'contentType',
						type: 'options',
						options: [
							{
								name: 'Text',
								value: 'text',
							},
							{
								name: 'Image (URL)',
								value: 'imageUrl',
							},
							{
								name: 'Image (Base64)',
								value: 'imageBase64',
							},
						],
						default: 'text',
					},
					{
						displayName: 'Image Base64',
						name: 'imageBase64',
						type: 'string',
						displayOptions: {
							show: {
								contentType: ['imageBase64'],
							},
						},
						default: '',
						description: 'Base64 encoded image data (without data:image prefix)',
					},
					{
						displayName: 'Image URL',
						name: 'imageUrl',
						type: 'string',
						displayOptions: {
							show: {
								contentType: ['imageUrl'],
							},
						},
						default: '',
						description: 'URL of the image to include in the message',
					},
					{
						displayName: 'MIME Type',
						name: 'mimeType',
						type: 'options',
						displayOptions: {
							show: {
								contentType: ['imageUrl', 'imageBase64'],
							},
						},
						options: [
							{
								name: 'Auto-Detect (Recommended)',
								value: '',
							},
							{
								name: 'GIF',
								value: 'image/gif',
							},
							{
								name: 'JPEG',
								value: 'image/jpeg',
							},
							{
								name: 'PNG',
								value: 'image/png',
							},
							{
								name: 'WebP',
								value: 'image/webp',
							},
						],
						default: '',
						description:
							'MIME type of the image. Leave empty for auto-detection (recommended for URLs).',
					},
					{
						displayName: 'Role',
						name: 'role',
						type: 'options',
						options: [
							{
								name: 'User',
								value: 'user',
							},
							{
								name: 'Model',
								value: 'model',
							},
						],
						default: 'user',
					},
					{
						displayName: 'Text',
						name: 'text',
						type: 'string',
						displayOptions: {
							show: {
								contentType: ['text'],
							},
						},
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Current Message',
		name: 'currentMessage',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['generateImage'],
			},
		},
		default: '',
		description: 'The current user message to send to the model',
		typeOptions: {
			rows: 3,
		},
	},
	{
		displayName: 'Response Modalities',
		name: 'responseModalities',
		type: 'multiOptions',
		displayOptions: {
			show: {
				operation: ['generateImage'],
			},
		},
		options: [
			{
				name: 'Text',
				value: 'TEXT',
			},
			{
				name: 'Image',
				value: 'IMAGE',
			},
		],
		default: ['TEXT', 'IMAGE'],
		description: 'Types of content the model should generate',
	},
	{
		displayName: 'Image Aspect Ratio',
		name: 'imageAspectRatio',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['generateImage'],
				responseModalities: ['IMAGE'],
			},
		},
		options: [
			{
				name: '1:1 (Square)',
				value: '1:1',
			},
			{
				name: '16:9 (Horizontal)',
				value: '16:9',
			},
			{
				name: '2:3 (Portrait)',
				value: '2:3',
			},
			{
				name: '21:9 (Ultra Wide)',
				value: '21:9',
			},
			{
				name: '3:2 (Landscape)',
				value: '3:2',
			},
			{
				name: '3:4 (Portrait)',
				value: '3:4',
			},
			{
				name: '4:3 (Landscape)',
				value: '4:3',
			},
			{
				name: '4:5 (Portrait)',
				value: '4:5',
			},
			{
				name: '5:4 (Landscape)',
				value: '5:4',
			},
			{
				name: '9:16 (Vertical)',
				value: '9:16',
			},
			{
				name: 'Auto',
				value: '',
				description: 'Let the model decide the aspect ratio automatically',
			},
		],
		default: '',
		description: 'Aspect ratio for the generated image',
	},
	{
		displayName: 'Image Resolution',
		name: 'imageSize',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['generateImage'],
				responseModalities: ['IMAGE'],
			},
		},
		options: [
			{
				name: '1K (Fast)',
				value: '1K',
				description: 'Lower resolution, faster generation',
			},
			{
				name: '2K (Balanced)',
				value: '2K',
				description: 'Medium resolution, balanced speed',
			},
			{
				name: '4K (High Quality)',
				value: '4K',
				description: 'High resolution, slower generation',
			},
		],
		default: '1K',
		description: 'Resolution for the generated image',
	},
	{
		displayName: 'Use Grounding Search',
		name: 'useGroundingSearch',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['generateImage'],
				model: ['gemini-3-pro-image-preview'],
			},
		},
		default: false,
		description: 'Whether to enable grounding search to ground image generation with real-world knowledge (only available for Nano Banana Pro)',
	},
	{
		displayName: 'Upload to S3',
		name: 'uploadToS3',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['generateImage'],
				responseModalities: ['IMAGE'],
			},
		},
		default: false,
		description: 'Whether to upload generated images to S3 and return the URL',
	},
	{
		displayName: 'S3 Bucket Name',
		name: 's3BucketName',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['generateImage'],
				responseModalities: ['IMAGE'],
				uploadToS3: [true],
			},
		},
		default: '',
		description: 'Name of the S3 bucket to upload to',
		required: true,
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				operation: ['generateImage'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				default: 1,
				typeOptions: {
					minValue: 0,
					maxValue: 2,
					numberPrecision: 2,
				},
				description:
					'Controls randomness in the output. Higher values make output more random.',
			},
			{
				displayName: 'Max Output Tokens',
				name: 'maxOutputTokens',
				type: 'number',
				default: 8192,
				description: 'Maximum number of tokens to generate',
			},
			{
				displayName: 'Top P',
				name: 'topP',
				type: 'number',
				default: 0.95,
				typeOptions: {
					minValue: 0,
					maxValue: 1,
					numberPrecision: 2,
				},
				description: 'Nucleus sampling parameter',
			},
			{
				displayName: 'Top K',
				name: 'topK',
				type: 'number',
				default: 40,
				description: 'Top-k sampling parameter',
			},
		],
	},
];