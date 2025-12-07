import { INodeProperties } from 'n8n-workflow';

export const generateVideoFields: INodeProperties[] = [
	{
		displayName: 'Video Model',
		name: 'videoModel',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['generateVideo'],
			},
		},
		options: [
			{
				name: 'Veo 3.1 Fast (Recommended)',
				value: 'veo-3.1-fast-generate-preview',
				description: 'Faster video generation with good quality',
			},
			{
				name: 'Veo 3.1',
				value: 'veo-3.1-generate-preview',
				description: 'Higher quality video generation (slower)',
			},
		],
		default: 'veo-3.1-fast-generate-preview',
	},
	{
		displayName: 'Generation Mode',
		name: 'generationMode',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['generateVideo'],
			},
		},
		options: [
			{
				name: 'Text to Video',
				value: 'textToVideo',
				description: 'Generate video from text prompt only',
			},
			{
				name: 'Frames to Video',
				value: 'framesToVideo',
				description: 'Generate video from start/end frame images with prompt',
			},
			{
				name: 'References to Video',
				value: 'referencesToVideo',
				description: 'Generate video using reference images and style',
			},
			{
				name: 'Extend Video',
				value: 'extendVideo',
				description: 'Extend an existing video',
			},
		],
		default: 'textToVideo',
		description: 'How to generate the video',
	},
	{
		displayName: 'Video Prompt',
		name: 'videoPrompt',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['generateVideo'],
			},
		},
		default: '',
		description: 'Text description of the video to generate',
		typeOptions: {
			rows: 4,
		},
	},
	{
		displayName: 'Aspect Ratio',
		name: 'aspectRatio',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['generateVideo'],
				generationMode: ['textToVideo', 'framesToVideo', 'referencesToVideo'],
			},
		},
		options: [
			{
				name: 'Landscape (16:9)',
				value: '16:9',
			},
			{
				name: 'Portrait (9:16)',
				value: '9:16',
			},
		],
		default: '16:9',
		description: 'Aspect ratio for the generated video',
	},
	{
		displayName: 'Resolution',
		name: 'resolution',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['generateVideo'],
			},
		},
		options: [
			{
				name: '720p',
				value: '720p',
				description: 'Standard HD resolution (faster)',
			},
			{
				name: '1080p',
				value: '1080p',
				description: 'Full HD resolution (slower, only supports 8s duration)',
			},
		],
		default: '720p',
		description: 'Video resolution',
	},
	{
		displayName: 'Duration (Seconds)',
		name: 'durationSeconds',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['generateVideo'],
				resolution: ['720p'],
			},
		},
		options: [
			{
				name: '4 Seconds',
				value: '4',
			},
			{
				name: '6 Seconds',
				value: '6',
			},
			{
				name: '8 Seconds',
				value: '8',
			},
		],
		default: '8',
		description: 'Length of generated video. 720p supports 4, 6, or 8 seconds.',
	},
	{
		displayName: 'Duration (Seconds)',
		name: 'durationSeconds',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['generateVideo'],
				resolution: ['1080p'],
			},
		},
		options: [
			{
				name: '8 Seconds',
				value: '8',
			},
		],
		default: '8',
		description: 'Length of generated video. 1080p only supports 8 seconds duration.',
	},
	{
		displayName: 'Negative Prompt',
		name: 'negativePrompt',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['generateVideo'],
			},
		},
		default: '',
		description: 'Text describing what NOT to include in the video (optional)',
		typeOptions: {
			rows: 2,
		},
	},
	{
		displayName: 'Person Generation',
		name: 'personGeneration',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['generateVideo'],
				generationMode: ['textToVideo', 'extendVideo'],
			},
		},
		options: [
			{
				name: 'Allow All',
				value: 'allow_all',
				description: 'Allow generation of all people (text-to-video & extension only)',
			},
		],
		default: 'allow_all',
		description: 'Controls generation of people in video (region restrictions may apply)',
	},
	{
		displayName: 'Person Generation',
		name: 'personGeneration',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['generateVideo'],
				generationMode: ['framesToVideo', 'referencesToVideo'],
			},
		},
		options: [
			{
				name: 'Allow Adult',
				value: 'allow_adult',
				description: 'Allow generation of adults only (image-to-video, interpolation & reference images)',
			},
		],
		default: 'allow_adult',
		description: 'Controls generation of people in video (region restrictions may apply)',
	},
	{
		displayName: 'Generate Audio',
		name: 'generateAudio',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['generateVideo'],
			},
		},
		default: true,
		description: 'Whether to generate audio. When disabled, adds "silent film, no audio, no sound effects, no background music" instructions to the prompt.',
	},
	// Frames to Video Mode Parameters
	{
		displayName: 'Start Frame URL',
		name: 'startFrameUrl',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['generateVideo'],
				generationMode: ['framesToVideo'],
			},
		},
		default: '',
		description: 'URL of the start frame image',
		placeholder: 'https://example.com/start-frame.jpg',
	},
	{
		displayName: 'Enable Looping',
		name: 'enableLooping',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['generateVideo'],
				generationMode: ['framesToVideo'],
			},
		},
		default: false,
		description: 'Whether to use start frame as end frame to create a looping video',
	},
	{
		displayName: 'End Frame URL',
		name: 'endFrameUrl',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['generateVideo'],
				generationMode: ['framesToVideo'],
				enableLooping: [false],
			},
		},
		default: '',
		description: 'URL of the end frame image (optional)',
		placeholder: 'https://example.com/end-frame.jpg',
	},
	// References to Video Mode Parameters
	{
		displayName: 'Reference Image URLs',
		name: 'referenceImages',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				operation: ['generateVideo'],
				generationMode: ['referencesToVideo'],
			},
		},
		default: {},
		placeholder: 'Add Reference Image',
		options: [
			{
				name: 'images',
				displayName: 'Images',
				values: [
					{
						displayName: 'Image URL',
						name: 'imageUrl',
						type: 'string',
						default: '',
						description: 'URL of the reference image to use as asset',
						placeholder: 'https://example.com/reference.jpg',
					},
				],
			},
		],
		description: 'Reference images to use as assets in the video',
	},
	{
		displayName: 'Style Image URL',
		name: 'styleImageUrl',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['generateVideo'],
				generationMode: ['referencesToVideo'],
			},
		},
		default: '',
		description: 'URL of the style reference image (optional)',
		placeholder: 'https://example.com/style.jpg',
	},
	// Extend Video Mode Parameters
	{
		displayName: 'Input Video URI',
		name: 'inputVideoUri',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['generateVideo'],
				generationMode: ['extendVideo'],
			},
		},
		default: '',
		required: true,
		description: 'Video URI from previous generation. Accepts full URL (https://generativelanguage.googleapis.com/v1beta/files/abc123), files path (files/abc123), or file ID (abc123).',
		placeholder: 'files/abc123 or full URL',
	},
	// S3 Configuration (Required for video output)
	{
		displayName: 'S3 Bucket Name',
		name: 's3BucketName',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['generateVideo'],
			},
		},
		default: '',
		description: 'Name of the S3 bucket to upload the generated video',
		required: true,
	},
	{
		displayName: 'S3 Public Domain',
		name: 's3PublicDomain',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['generateVideo'],
			},
		},
		default: '',
		description: 'Optional public domain URL (e.g., https://cdn.example.com). If provided, the final URL will be [public_domain]/path/to/file.ext instead of the default S3 URL.',
		placeholder: 'https://cdn.example.com',
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				operation: ['generateVideo'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Polling Interval (Seconds)',
				name: 'pollingInterval',
				type: 'number',
				default: 10,
				typeOptions: {
					minValue: 5,
					maxValue: 60,
				},
				description: 'How often to check video generation status (in seconds)',
			},
			{
				displayName: 'Max Wait Time (Minutes)',
				name: 'maxWaitTime',
				type: 'number',
				default: 30,
				typeOptions: {
					minValue: 5,
					maxValue: 60,
				},
				description: 'Maximum time to wait for video generation to complete (in minutes)',
			},
		],
	},
];