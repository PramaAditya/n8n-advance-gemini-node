import { INodeProperties } from 'n8n-workflow';

export const maleVoices = [
	'Puck', 'Charon', 'Fenrir', 'Orus', 'Enceladus', 'Iapetus', 'Umbriel',
	'Algieba', 'Algenib', 'Rasalgethi', 'Alnilam', 'Schedar', 'Achird',
	'Zubenelgenubi', 'Sadachbia', 'Sadaltager'
];

export const femaleVoices = [
	'Zephyr', 'Kore', 'Leda', 'Aoede', 'Callirrhoe', 'Autonoe', 'Despina',
	'Erinome', 'Laomedeia', 'Achernar', 'Gacrux', 'Pulcherrima',
	'Vindemiatrix', 'Sulafat'
];

export const allVoices = [...maleVoices, ...femaleVoices];

const voiceOptions = [
	{ name: '🎲 Random', value: '__random__' },
	{ name: '🎲 Random Male', value: '__random_male__' },
	{ name: '🎲 Random Female', value: '__random_female__' },
	{ name: '♀️ Zephyr (Bright)', value: 'Zephyr' },
	{ name: '♂️ Puck (Upbeat)', value: 'Puck' },
	{ name: '♂️ Charon (Informative)', value: 'Charon' },
	{ name: '♀️ Kore (Firm)', value: 'Kore' },
	{ name: '♂️ Fenrir (Excitable)', value: 'Fenrir' },
	{ name: '♀️ Leda (Youthful)', value: 'Leda' },
	{ name: '♂️ Orus (Firm)', value: 'Orus' },
	{ name: '♀️ Aoede (Breezy)', value: 'Aoede' },
	{ name: '♀️ Callirrhoe (Easy-Going)', value: 'Callirrhoe' },
	{ name: '♀️ Autonoe (Bright)', value: 'Autonoe' },
	{ name: '♂️ Enceladus (Breathy)', value: 'Enceladus' },
	{ name: '♂️ Iapetus (Clear)', value: 'Iapetus' },
	{ name: '♂️ Umbriel (Easy-Going)', value: 'Umbriel' },
	{ name: '♂️ Algieba (Smooth)', value: 'Algieba' },
	{ name: '♀️ Despina (Smooth)', value: 'Despina' },
	{ name: '♀️ Erinome (Clear)', value: 'Erinome' },
	{ name: '♂️ Algenib (Gravelly)', value: 'Algenib' },
	{ name: '♂️ Rasalgethi (Informative)', value: 'Rasalgethi' },
	{ name: '♀️ Laomedeia (Upbeat)', value: 'Laomedeia' },
	{ name: '♀️ Achernar (Soft)', value: 'Achernar' },
	{ name: '♂️ Alnilam (Firm)', value: 'Alnilam' },
	{ name: '♂️ Schedar (Even)', value: 'Schedar' },
	{ name: '♀️ Gacrux (Mature)', value: 'Gacrux' },
	{ name: '♀️ Pulcherrima (Forward)', value: 'Pulcherrima' },
	{ name: '♂️ Achird (Friendly)', value: 'Achird' },
	{ name: '♂️ Zubenelgenubi (Casual)', value: 'Zubenelgenubi' },
	{ name: '♀️ Vindemiatrix (Gentle)', value: 'Vindemiatrix' },
	{ name: '♂️ Sadachbia (Lively)', value: 'Sadachbia' },
	{ name: '♂️ Sadaltager (Knowledgeable)', value: 'Sadaltager' },
	{ name: '♀️ Sulafat (Warm)', value: 'Sulafat' },
];

export const generateTTSFields: INodeProperties[] = [
	{
		displayName: 'Model',
		name: 'ttsModel',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['generateTTS'],
			},
		},
		options: [
			{
				name: 'Flash (Recommended)',
				value: 'gemini-2.5-flash-preview-tts',
				description: 'Fewer restrictions, higher quota',
			},
			{
				name: 'Pro',
				value: 'gemini-2.5-pro-preview-tts',
				description: 'Higher quality, more restrictions',
			},
		],
		default: 'gemini-2.5-flash-preview-tts',
	},
	{
		displayName: 'Voice Instruction',
		name: 'voiceInstruction',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['generateTTS'],
			},
		},
		default: 'Read aloud in a warm, welcoming tone',
		description: 'Instructions for how the voice should speak (tone, style, etc.)',
		typeOptions: {
			rows: 2,
		},
		required: true,
	},
	{
		displayName: 'Voice Transcript',
		name: 'voiceTranscript',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['generateTTS'],
			},
		},
		default: '',
		description: 'The text to convert to speech',
		typeOptions: {
			rows: 4,
		},
		required: true,
	},
	{
		displayName: 'Voice Mode',
		name: 'voiceMode',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['generateTTS'],
			},
		},
		options: [
			{
				name: 'Single Voice',
				value: 'single',
				description: 'Use a single voice for all text',
			},
			{
				name: 'Multi-Speaker',
				value: 'multi',
				description: 'Use different voices for different speakers',
			},
		],
		default: 'single',
	},
	{
		displayName: 'Voice Name',
		name: 'voiceName',
		type: 'options',
		displayOptions: {
			show: {
				operation: ['generateTTS'],
				voiceMode: ['single'],
			},
		},
		options: voiceOptions,
		default: 'Zephyr',
		description: 'The voice to use for text-to-speech',
	},
	{
		displayName: 'Speaker Voices',
		name: 'speakerVoices',
		type: 'fixedCollection',
		displayOptions: {
			show: {
				operation: ['generateTTS'],
				voiceMode: ['multi'],
			},
		},
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		options: [
			{
				name: 'speakers',
				displayName: 'Speakers',
				values: [
					{
						displayName: 'Speaker Label',
						name: 'speakerLabel',
						type: 'string',
						default: 'Speaker 1',
						description: 'Label for this speaker (e.g., "Speaker 1", "Narrator")',
					},
					{
						displayName: 'Voice Name',
						name: 'voiceName',
						type: 'options',
						options: voiceOptions,
						default: 'Zephyr',
						description: 'Voice to use for this speaker',
					},
				],
			},
		],
		description: 'Configure voices for each speaker in multi-speaker mode',
	},
	{
		displayName: 'Upload to S3',
		name: 'uploadToS3',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['generateTTS'],
			},
		},
		default: false,
		description: 'Whether to upload generated audio to S3 and return the URL',
	},
	{
		displayName: 'S3 Bucket Name',
		name: 's3BucketName',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['generateTTS'],
				uploadToS3: [true],
			},
		},
		default: '',
		description: 'Name of the S3 bucket to upload to',
		required: true,
	},
	{
		displayName: 'S3 Public Domain',
		name: 's3PublicDomain',
		type: 'string',
		displayOptions: {
			show: {
				operation: ['generateTTS'],
				uploadToS3: [true],
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
				operation: ['generateTTS'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				default: 0.65,
				typeOptions: {
					minValue: 0,
					maxValue: 2,
					numberPrecision: 2,
				},
				description: 'Controls randomness in the output',
			},
			{
				displayName: 'Playback Speed',
				name: 'playbackSpeed',
				type: 'number',
				default: 1.0,
				typeOptions: {
					minValue: 0.1,
					maxValue: 10.0,
					numberPrecision: 2,
				},
				description: 'Adjust playback speed of the output audio. 1.0 = normal, 2.0 = 2x faster, 0.5 = half speed.',
			},
		],
	},
];