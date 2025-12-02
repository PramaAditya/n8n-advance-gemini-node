import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { NodeOperationError } from 'n8n-workflow';

import { GoogleGenAI } from '@google/genai';
import { ImageUtils } from './utils/imageUtils';
import { S3Utils } from './utils/s3Utils';
import { ulid } from 'ulid';

export class Gemini implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Advance Gemini',
		name: 'gemini',
		icon: 'file:gemini.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Interact with Google Gemini AI models',
		defaults: {
			name: 'Advance Gemini',
		},
		inputs: ['main'],
		outputs: ['main'],
		usableAsTool: true,
		credentials: [
			{
				name: 'googlePalmApi',
				required: true,
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-class-description-credentials-name-unsuffixed
				name: 's3',
				required: false,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Generate Image',
						value: 'generateContent',
						description: 'Generate text and images using Gemini models',
						// eslint-disable-next-line n8n-nodes-base/node-param-operation-option-action-miscased
						action: 'Generate image with Nano Banana',
					},
				],
				default: 'generateContent',
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['generateContent'],
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
						operation: ['generateContent'],
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
						operation: ['generateContent'],
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
						operation: ['generateContent'],
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
						operation: ['generateContent'],
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
						operation: ['generateContent'],
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
						operation: ['generateContent'],
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
						operation: ['generateContent'],
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
						operation: ['generateContent'],
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
						operation: ['generateContent'],
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
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const model = this.getNodeParameter('model', i) as string;

				if (operation === 'generateContent') {
					const credentials = await this.getCredentials('googlePalmApi', i);
					const responseModalities = this.getNodeParameter('responseModalities', i) as string[];
					const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as any;

					// Initialize Google GenAI
					const ai = new GoogleGenAI({
						apiKey: credentials.apiKey as string,
					});

					// Build contents array
					const contents: any[] = [];

					// Handle manual mapping format (existing functionality)
					const messageHistory = this.getNodeParameter('messageHistory.messages', i, []) as any[];
					const currentMessage = this.getNodeParameter('currentMessage', i) as string;

					// Add message history
					for (const message of messageHistory) {
						const parts: any[] = [];

						if (message.contentType === 'text' && message.text) {
							parts.push({ text: message.text });
						} else if (
							message.contentType === 'imageUrl' ||
							message.contentType === 'imageBase64'
						) {
							try {
								const geminiPart = await ImageUtils.createGeminiPart(this, message);
								parts.push(geminiPart);
							} catch (error) {
								throw new NodeOperationError(
									this.getNode(),
									`Error processing image in message history: ${error.message}`,
									{ itemIndex: i },
								);
							}
						}

						// Only add message if it has parts
						if (parts.length > 0) {
							contents.push({
								role: message.role,
								parts,
							});
						}
					}

					// Add current message
					if (currentMessage) {
						contents.push({
							role: 'user',
							parts: [{ text: currentMessage }],
						});
					}

					// Build generation config
					const config: any = {
						responseModalities,
					};

					// Add image configuration if IMAGE response modality is enabled
					if (responseModalities.includes('IMAGE')) {
						const imageAspectRatio = this.getNodeParameter('imageAspectRatio', i, '') as string;
						const imageSize = this.getNodeParameter('imageSize', i, '1K') as string;

						const imageConfig: any = {};
						
						// Only add aspectRatio if it's not Auto (empty string)
						if (imageAspectRatio) {
							imageConfig.aspectRatio = imageAspectRatio;
						}
						
						imageConfig.imageSize = imageSize;
						
						config.imageConfig = imageConfig;
					}

					// Add grounding search tools if enabled (only for gemini-3-pro-image-preview)
					if (model === 'gemini-3-pro-image-preview') {
						const useGroundingSearch = this.getNodeParameter('useGroundingSearch', i, false) as boolean;
						
						if (useGroundingSearch) {
							config.tools = [
								{
									googleSearch: {},
								},
							];
						}
					}

					if (additionalOptions.temperature !== undefined) {
						config.temperature = additionalOptions.temperature;
					}
					if (additionalOptions.maxOutputTokens !== undefined) {
						config.maxOutputTokens = additionalOptions.maxOutputTokens;
					}
					if (additionalOptions.topP !== undefined) {
						config.topP = additionalOptions.topP;
					}
					if (additionalOptions.topK !== undefined) {
						config.topK = additionalOptions.topK;
					}

					// Generate content
					let textResponse = '';
					const generatedImages: any[] = [];

					// Use non-streaming response
					const response = await ai.models.generateContent({
						model,
						config,
						contents,
					});

					if (response.candidates && response.candidates[0].content) {
						const parts = response.candidates[0].content.parts ?? [];
						let fileIndex = 0;

						if (parts && Array.isArray(parts)) {
							for (const part of parts) {
								if (part.inlineData) {
									// Handle generated image
									const mimeType = part.inlineData.mimeType || 'image/png';
									const data = part.inlineData.data || '';
									
									if (this.getNodeParameter('uploadToS3', i, false)) {
										const bucketName = this.getNodeParameter('s3BucketName', i) as string;
										const buffer = Buffer.from(data, 'base64');
										
										const s3Url = await S3Utils.uploadToS3(
											this,
											buffer,
											mimeType,
											bucketName,
											`gemini_${ulid()}_${fileIndex++}`
										);
										
										generatedImages.push({
											url: s3Url,
											mimeType,
											fileName: s3Url.split('/').pop(),
										});
									} else {
										const fileName = `img_${ulid()}_${fileIndex++}`;
										const imageData = ImageUtils.saveBinaryToNodeData(
											data,
											mimeType,
											fileName,
										);
										generatedImages.push(imageData);
									}
								} else if (part.text) {
									// Handle text response
									textResponse += part.text;
								}
							}
						}
					}

					// Prepare result
					const result: any = {
						text: textResponse,
						model,
						responseModalities,
						usage: {
							totalTokens: textResponse.length, // Approximate
						},
					};

					// Add image metadata to JSON result if images were generated
					if (generatedImages.length > 0) {
						if (generatedImages[0].url) {
							// S3 Upload case
							result.images = generatedImages.map(img => ({
								url: img.url,
								fileName: img.fileName,
								mimeType: img.mimeType
							}));
							// Backward compatibility for single image
							result.imageUrl = generatedImages[0].url;
						} else {
							// Binary data case
							result.metadata = {
								mimeType: generatedImages[0].mimeType,
								fileName: generatedImages[0].fileName,
							};
						}
					}

					const responseData: INodeExecutionData = {
						json: result,
						pairedItem: { item: i },
					};

					// Only add binary data if NOT uploading to S3
					if (generatedImages.length > 0 && !generatedImages[0].url) {
						responseData.binary = {
							data: {
								data: generatedImages[0].data.toString('base64'),
								mimeType: generatedImages[0].mimeType,
								fileName: generatedImages[0].fileName,
							},
						};
					}

					returnData.push(responseData);
				}
			} catch (error) {
				// Sanitize error message to prevent binary data leakage
				const sanitizedMessage = error.message
					? error.message.replace(/[\x00-\x1F\x7F-\x9F]/g, '')
					: 'Unknown error occurred';

				if (this.continueOnFail()) {
					returnData.push({
						json: { error: sanitizedMessage },
						pairedItem: { item: i },
					});
					continue;
				}

				const sanitizedError = new Error(sanitizedMessage);
				sanitizedError.stack = error.stack;
				throw new NodeOperationError(this.getNode(), sanitizedError, { itemIndex: i });
			}
		}

		return [returnData];
	}
}