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
import { AudioUtils } from './utils/audioUtils';
import { ulid } from 'ulid';
import { generateImageFields } from './descriptions/GenerateImageDescription';
import { generateTTSFields, maleVoices, femaleVoices, allVoices } from './descriptions/GenerateTextToSpeechDescription';

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
						value: 'generateImage',
						description: 'Generate text and images using Gemini models',
						// eslint-disable-next-line n8n-nodes-base/node-param-operation-option-action-miscased
						action: 'Generate image with Nano Banana',
					},
					{
						name: 'Generate TTS',
						value: 'generateTTS',
						description: 'Convert text to speech using Gemini TTS models',
						action: 'Generate speech audio',
					},
				],
				default: 'generateImage',
			},
			...generateImageFields,
			...generateTTSFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;

				if (operation === 'generateImage') {
					const model = this.getNodeParameter('model', i) as string;
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
											`${operation}/gemini_${ulid()}_${fileIndex++}`
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
				} else if (operation === 'generateTTS') {
					const credentials = await this.getCredentials('googlePalmApi', i);
					const ttsModel = this.getNodeParameter('ttsModel', i) as string;
					const voiceInstruction = this.getNodeParameter('voiceInstruction', i) as string;
					const voiceTranscript = this.getNodeParameter('voiceTranscript', i) as string;
					const voiceMode = this.getNodeParameter('voiceMode', i) as string;
					const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as any;

					// Initialize Google GenAI
					const ai = new GoogleGenAI({
						apiKey: credentials.apiKey as string,
					});

					// Build config
					const config: any = {
						responseModalities: ['audio'],
					};

					// Add speech config based on voice mode
					if (voiceMode === 'single') {
						let voiceName = this.getNodeParameter('voiceName', i) as string;
						
						// Handle random voice selection
						if (voiceName === '__random__') {
							voiceName = allVoices[Math.floor(Math.random() * allVoices.length)];
						} else if (voiceName === '__random_male__') {
							voiceName = maleVoices[Math.floor(Math.random() * maleVoices.length)];
						} else if (voiceName === '__random_female__') {
							voiceName = femaleVoices[Math.floor(Math.random() * femaleVoices.length)];
						}
						
						config.speechConfig = {
							voiceConfig: {
								prebuiltVoiceConfig: {
									voiceName,
								},
							},
						};
					} else {
						// Multi-speaker mode
						const speakerVoices = this.getNodeParameter('speakerVoices.speakers', i, []) as any[];
						const usedVoices = new Set<string>();
						
						const speakerVoiceConfigs = speakerVoices.map((speaker) => {
							let voiceName = speaker.voiceName;
							
							// Handle random voice selection for each speaker
							if (voiceName === '__random__') {
								// Filter out already used voices
								const availableVoices = allVoices.filter(v => !usedVoices.has(v));
								if (availableVoices.length === 0) {
									// Fallback if all voices are used (shouldn't happen with 30 voices)
									voiceName = allVoices[Math.floor(Math.random() * allVoices.length)];
								} else {
									voiceName = availableVoices[Math.floor(Math.random() * availableVoices.length)];
								}
							} else if (voiceName === '__random_male__') {
								const availableMaleVoices = maleVoices.filter(v => !usedVoices.has(v));
								if (availableMaleVoices.length === 0) {
									voiceName = maleVoices[Math.floor(Math.random() * maleVoices.length)];
								} else {
									voiceName = availableMaleVoices[Math.floor(Math.random() * availableMaleVoices.length)];
								}
							} else if (voiceName === '__random_female__') {
								const availableFemaleVoices = femaleVoices.filter(v => !usedVoices.has(v));
								if (availableFemaleVoices.length === 0) {
									voiceName = femaleVoices[Math.floor(Math.random() * femaleVoices.length)];
								} else {
									voiceName = availableFemaleVoices[Math.floor(Math.random() * availableFemaleVoices.length)];
								}
							}
							
							// Track this voice as used
							usedVoices.add(voiceName);
							
							return {
								speaker: speaker.speakerLabel,
								voiceConfig: {
									prebuiltVoiceConfig: {
										voiceName,
									},
								},
							};
						});

						config.speechConfig = {
							multiSpeakerVoiceConfig: {
								speakerVoiceConfigs,
							},
						};
					}

					if (additionalOptions.temperature !== undefined) {
						config.temperature = additionalOptions.temperature;
					}

					// Build content with instruction and transcript
					const textContent = `${voiceInstruction}\n${voiceTranscript}`;
					const contents = [
						{
							role: 'user',
							parts: [{ text: textContent }],
						},
					];

					// Generate TTS using streaming
					const response = await ai.models.generateContentStream({
						model: ttsModel,
						config,
						contents,
					});

					const audioChunks: Buffer[] = [];
					for await (const chunk of response) {
						if (
							chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData
						) {
							const inlineData = chunk.candidates[0].content.parts[0].inlineData;
							const rawData = inlineData.data || '';
							const mimeType = inlineData.mimeType || '';

							// Convert to WAV
							const wavBuffer = AudioUtils.convertToWav(rawData, mimeType);
							audioChunks.push(wavBuffer);
						}
					}

					// Combine all audio chunks
					const finalAudio = Buffer.concat(audioChunks);

					// Handle output (S3 or binary)
					const result: any = {
						model: ttsModel,
						voiceMode,
						audioFormat: 'audio/wav',
					};

					if (this.getNodeParameter('uploadToS3', i, false)) {
						const bucketName = this.getNodeParameter('s3BucketName', i) as string;
						
						const s3Url = await S3Utils.uploadToS3(
							this,
							finalAudio,
							'audio/wav',
							bucketName,
							`${operation}/tts_${ulid()}`
						);
						
						result.audioUrl = s3Url;
						result.fileName = s3Url.split('/').pop();

						returnData.push({
							json: result,
							pairedItem: { item: i },
						});
					} else {
						const fileName = `tts_${ulid()}`;
						
						returnData.push({
							json: result,
							binary: {
								data: {
									data: finalAudio.toString('base64'),
									mimeType: 'audio/wav',
									fileName: `${fileName}.wav`,
								},
							},
							pairedItem: { item: i },
						});
					}
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