import { INodeProperties } from 'n8n-workflow';

export const generateLivePhotoFields: INodeProperties[] = [
	{
		displayName: 'Video Model',
		name: 'livePhotoModel',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['generateLivePhoto'],
			},
		},
		options: [
			{
				name: 'Veo 3.1 Fast (Recommended)',
				value: 'veo-3.1-fast-generate-preview',
				description: 'Faster live photo generation',
			},
			{
				name: 'Veo 3.1',
				value: 'veo-3.1-generate-preview',
				description: 'Higher quality live photo generation (slower)',
			},
		],
		default: 'veo-3.1-fast-generate-preview',
		description: 'Model to use for generating the live photo video',
	},
	{
		displayName: 'Image URL',
		name: 'livePhotoImageUrl',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['generateLivePhoto'],
			},
		},
		default: '',
		required: true,
		description: 'URL of the image to use as the starting frame for the live photo',
		placeholder: 'https://example.com/photo.jpg',
	},
	{
		displayName: 'Motion Description (Optional)',
		name: 'livePhotoPrompt',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['generateLivePhoto'],
			},
		},
		default: '',
		description: 'Describe the subtle motion you want. Leave empty for natural ambient movement.',
		placeholder: 'e.g., "gentle breeze moving hair and leaves"',
		typeOptions: {
			rows: 2,
		},
	},
	{
		displayName: 'S3 Bucket Name',
		name: 's3BucketName',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['generateLivePhoto'],
			},
		},
		default: '',
		description: 'Name of the S3 bucket to upload the live photo video',
		required: true,
	},
	{
		displayName: 'S3 Public Domain',
		name: 's3PublicDomain',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['generateLivePhoto'],
			},
		},
		default: '',
		description: 'Optional public domain URL (e.g., https://cdn.example.com). If provided, the final URL will use this domain instead of the S3 URL.',
		placeholder: 'https://cdn.example.com',
	},
	{
		displayName: 'Additional Options',
		name: 'additionalOptions',
		type: 'collection',
		placeholder: 'Add Option',
		displayOptions: {
			show: {
				operation: ['generateLivePhoto'],
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