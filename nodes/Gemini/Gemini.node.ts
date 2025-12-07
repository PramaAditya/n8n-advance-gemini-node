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
import { VideoUtils } from './utils/videoUtils';
import { ulid } from 'ulid';
import { generateImageFields } from './descriptions/GenerateImageDescription';
import { generateTTSFields, maleVoices, femaleVoices, allVoices } from './descriptions/GenerateTextToSpeechDescription';
import { generateVideoFields } from './descriptions/GenerateVideoDescription';
import { generateLivePhotoFields } from './descriptions/GenerateLivePhotoDescription';

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
					{
						name: 'Generate Video',
						value: 'generateVideo',
						description: 'Generate videos using Veo models',
						action: 'Generate video with veo',
					},
					{
						name: 'Generate Live Photo',
						value: 'generateLivePhoto',
						description: 'Generate iOS-style live photos with subtle motion',
						action: 'Generate live photo',
					},
				],
				default: 'generateImage',
			},
			...generateImageFields,
			...generateTTSFields,
			...generateVideoFields,
			...generateLivePhotoFields,
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
					let currentMessage = this.getNodeParameter('currentMessage', i) as string;

					// Track definitions from user role messages
					const definitions: Array<{ key: string; definition: string }> = [];
					let imageCount = 0;
					let textCount = 0;

					// Add message history
					for (const message of messageHistory) {
						const parts: any[] = [];

						if (message.contentType === 'text' && message.text) {
							parts.push({ text: message.text });
							
							// Track text definition if this is a user message
							if (message.role === 'user' && message.definition && message.definition.trim()) {
								textCount++;
								definitions.push({
									key: `[TEXT_${textCount}]`,
									definition: message.definition.trim(),
								});
							}
						} else if (
							message.contentType === 'imageUrl' ||
							message.contentType === 'imageBase64'
						) {
							try {
								const geminiPart = await ImageUtils.createGeminiPart(this, message);
								parts.push(geminiPart);
								
								// Track image definition if this is a user message
								if (message.role === 'user' && message.definition && message.definition.trim()) {
									imageCount++;
									definitions.push({
										key: `[IMAGE_${imageCount}]`,
										definition: message.definition.trim(),
									});
								}
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

					// Build INPUT DEFINITIONS block if there are any definitions
					if (definitions.length > 0) {
						const definitionsBlock = [
							'INPUT DEFINITIONS:',
							...definitions.map(def => `\`${def.key}\` : ${def.definition}`),
							'---',
							'',
						].join('\n');
						
						// Prepend definitions to current message
						currentMessage = definitionsBlock + currentMessage;
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
										const s3PublicDomain = this.getNodeParameter('s3PublicDomain', i, '') as string;
										const buffer = Buffer.from(data, 'base64');
										
										const s3Url = await S3Utils.uploadToS3(
											this,
											buffer,
											mimeType,
											bucketName,
											`${operation}/gemini_${ulid()}_${fileIndex++}`,
											5,
											s3PublicDomain
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
						const s3PublicDomain = this.getNodeParameter('s3PublicDomain', i, '') as string;
						
						const s3Url = await S3Utils.uploadToS3(
							this,
							finalAudio,
							'audio/wav',
							bucketName,
							`${operation}/tts_${ulid()}`,
							5,
							s3PublicDomain
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
				} else if (operation === 'generateVideo') {
					const credentials = await this.getCredentials('googlePalmApi', i);
					const videoModel = this.getNodeParameter('videoModel', i) as string;
					const generationMode = this.getNodeParameter('generationMode', i) as string;
					const videoPrompt = this.getNodeParameter('videoPrompt', i, '') as string;
					const negativePrompt = this.getNodeParameter('negativePrompt', i, '') as string;
					const resolution = this.getNodeParameter('resolution', i) as string;
					const durationSeconds = parseInt(this.getNodeParameter('durationSeconds', i, '8') as string, 10);
					const personGeneration = this.getNodeParameter('personGeneration', i, '') as string;
					const generateAudio = this.getNodeParameter('generateAudio', i, true) as boolean;
					const s3BucketName = this.getNodeParameter('s3BucketName', i) as string;
					const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as any;

					// Validate parameters based on mode
					VideoUtils.validateParameters(this, generationMode, {
						videoPrompt,
						startFrameUrl: generationMode === 'framesToVideo' ? this.getNodeParameter('startFrameUrl', i, '') : '',
						referenceImages: generationMode === 'referencesToVideo' ? this.getNodeParameter('referenceImages.images', i, []) : [],
						inputVideoUri: generationMode === 'extendVideo' ? this.getNodeParameter('inputVideoUri', i, '') : '',
					});

					// Initialize Google GenAI
					const ai = new GoogleGenAI({
						apiKey: credentials.apiKey as string,
					});

					// Build config
					const aspectRatio = generationMode !== 'extendVideo' 
						? this.getNodeParameter('aspectRatio', i) as string
						: undefined;

					const config: any = VideoUtils.buildVideoConfig({
						resolution,
						aspectRatio,
						numberOfVideos: 1,
					});

					// Add duration as number
					config.durationSeconds = durationSeconds;

					// Add person generation if specified
					if (personGeneration) {
						config.personGeneration = personGeneration;
					}

					// Build generate video payload
					const generateVideoPayload: any = {
						model: videoModel,
						config,
					};

					// Handle prompt with audio preference
					let finalPrompt = videoPrompt && videoPrompt.trim() ? videoPrompt.trim() : '';
					
					// If audio is disabled, prepend silent instructions to prompt
					if (!generateAudio && finalPrompt) {
						finalPrompt = `[Silent film, no audio, no sound effects, no background music] ${finalPrompt}`;
					}
					
					// Add prompt if provided
					if (finalPrompt) {
						generateVideoPayload.prompt = finalPrompt;
					}

					if (negativePrompt && negativePrompt.trim()) {
						generateVideoPayload.negativePrompt = negativePrompt;
					}

					// Handle different generation modes
					if (generationMode === 'framesToVideo') {
						const startFrameUrl = this.getNodeParameter('startFrameUrl', i) as string;
						const enableLooping = this.getNodeParameter('enableLooping', i, false) as boolean;
						const endFrameUrl = this.getNodeParameter('endFrameUrl', i, '') as string;

						// Process start frame
						const startFrame = await VideoUtils.fetchImageForVideo(this, startFrameUrl);
						generateVideoPayload.image = startFrame;

						// Process end frame (or use start frame for looping)
						const finalEndFrameUrl = enableLooping ? startFrameUrl : endFrameUrl;
						if (finalEndFrameUrl && finalEndFrameUrl.trim()) {
							const endFrame = await VideoUtils.fetchImageForVideo(this, finalEndFrameUrl);
							generateVideoPayload.config.lastFrame = endFrame;
						}
					} else if (generationMode === 'referencesToVideo') {
						const referenceImagesData = this.getNodeParameter('referenceImages.images', i, []) as any[];
						const styleImageUrl = this.getNodeParameter('styleImageUrl', i, '') as string;

						const referenceImagesPayload: any[] = [];

						// Add reference images (assets)
						for (const refImg of referenceImagesData) {
							if (refImg.imageUrl && refImg.imageUrl.trim()) {
								const image = await VideoUtils.fetchImageForVideo(this, refImg.imageUrl);
								referenceImagesPayload.push({
									image,
									referenceType: 'ASSET',
								});
							}
						}

						// Add style image if provided
						if (styleImageUrl && styleImageUrl.trim()) {
							const styleImage = await VideoUtils.fetchImageForVideo(this, styleImageUrl);
							referenceImagesPayload.push({
								image: styleImage,
								referenceType: 'STYLE',
							});
						}

						if (referenceImagesPayload.length > 0) {
							generateVideoPayload.config.referenceImages = referenceImagesPayload;
						}
					} else if (generationMode === 'extendVideo') {
						const inputVideoUri = this.getNodeParameter('inputVideoUri', i) as string;
						const videoObject = VideoUtils.createVideoObject(inputVideoUri);
						generateVideoPayload.video = videoObject;
					}

					// Start video generation
					let videoOperation = await ai.models.generateVideos(generateVideoPayload);

					// Polling configuration
					const pollingInterval = (additionalOptions.pollingInterval || 10) * 1000; // Convert to ms
					const maxWaitTime = (additionalOptions.maxWaitTime || 30) * 60 * 1000; // Convert to ms
					const startTime = Date.now();

					// Poll until video generation is complete
					while (!videoOperation.done) {
						// Check timeout
						if (Date.now() - startTime > maxWaitTime) {
							throw new NodeOperationError(
								this.getNode(),
								`Video generation timed out after ${additionalOptions.maxWaitTime || 30} minutes`,
								{ itemIndex: i },
							);
						}

						// Wait for polling interval
						await new Promise((resolve) => setTimeout(resolve, pollingInterval));

						// Get updated operation status
						videoOperation = await ai.operations.getVideosOperation({ operation: videoOperation });
					}

					// Check if generation was successful
					if (!videoOperation.response) {
						throw new NodeOperationError(
							this.getNode(),
							'Video generation failed: No response from API',
							{ itemIndex: i },
						);
					}
					
					// Check for error and safety filters (type-safe way)
					const responseAny = videoOperation.response as any;
					if (responseAny.error) {
						throw new NodeOperationError(
							this.getNode(),
							`Video generation failed: ${JSON.stringify(responseAny.error)}`,
							{ itemIndex: i },
						);
					}
					
					// Check for safety filter
					if (responseAny.raiMediaFilteredCount && responseAny.raiMediaFilteredCount > 0) {
						const reasons = responseAny.raiMediaFilteredReasons || [];
						throw new NodeOperationError(
							this.getNode(),
							`Video generation was blocked by safety filters.\nReasons: ${reasons.join('; ')}\n\nPlease try modifying your prompt or using different images.`,
							{ itemIndex: i },
						);
					}
					
					// SDK may return either generatedVideos (normalized) or generateVideoResponse.generatedSamples (raw API)
					const generatedSamples = responseAny.generatedVideos || responseAny.generateVideoResponse?.generatedSamples;
					if (!generatedSamples || !Array.isArray(generatedSamples) || generatedSamples.length === 0) {
						throw new NodeOperationError(
							this.getNode(),
							`No videos were generated. Response: ${JSON.stringify(videoOperation.response).substring(0, 500)}`,
							{ itemIndex: i },
						);
					}

					const firstVideo = generatedSamples[0];
					if (!firstVideo?.video?.uri) {
						throw new NodeOperationError(
							this.getNode(),
							'Generated video is missing URI',
							{ itemIndex: i },
						);
					}

					const videoObject = firstVideo.video;
					const videoUri = videoObject.uri ? decodeURIComponent(videoObject.uri) : '';
					
					if (!videoUri) {
						throw new NodeOperationError(
							this.getNode(),
							'Generated video URI is empty',
							{ itemIndex: i },
						);
					}

					// Fetch the video from Gemini
					const videoResponse = await this.helpers.httpRequest({
						method: 'GET',
						url: `${videoUri}&key=${credentials.apiKey}`,
						returnFullResponse: true,
						encoding: 'arraybuffer',
					});

					// Ensure we have a Buffer
					let videoBuffer: Buffer;
					if (Buffer.isBuffer(videoResponse.body)) {
						videoBuffer = videoResponse.body;
					} else if (typeof videoResponse.body === 'string') {
						videoBuffer = Buffer.from(videoResponse.body, 'binary');
					} else {
						videoBuffer = Buffer.from(videoResponse.body);
					}

					// If audio generation is disabled, try to remove audio using ffmpeg
					let finalVideoBuffer = videoBuffer;
					let audioRemovalAttempted = false;
					let audioRemovalSuccess = false;
					
					if (!generateAudio) {
						audioRemovalAttempted = true;
						const result = await VideoUtils.removeAudioFromVideo(this, videoBuffer);
						finalVideoBuffer = result.buffer;
						audioRemovalSuccess = result.audioRemoved;
					}

					// Upload to S3
					const s3PublicDomain = this.getNodeParameter('s3PublicDomain', i, '') as string;
					const s3Url = await S3Utils.uploadToS3(
						this,
						finalVideoBuffer,
						'video/mp4',
						s3BucketName,
						`${operation}/veo_${ulid()}`,
						5,
						s3PublicDomain
					);

					// Prepare result
					const result: any = {
						videoUrl: s3Url,
						fileName: s3Url.split('/').pop(),
						model: videoModel,
						resolution,
						generationMode,
						geminiVideoUri: videoObject.uri,
					};

					if (aspectRatio) {
						result.aspectRatio = aspectRatio;
					}

					if (videoPrompt) {
						result.prompt = videoPrompt;
					}

					if (negativePrompt) {
						result.negativePrompt = negativePrompt;
					}

					if (durationSeconds) {
						result.durationSeconds = durationSeconds;
					}

					if (personGeneration) {
						result.personGeneration = personGeneration;
					}

					result.generateAudio = generateAudio;
					
					// Add audio removal info if attempted
					if (audioRemovalAttempted) {
						result.audioRemovalAttempted = true;
						result.audioRemovalSuccess = audioRemovalSuccess;
						if (!audioRemovalSuccess) {
							result.audioRemovalNote = 'ffmpeg not available or failed - video may contain audio';
						}
					}

					returnData.push({
						json: result,
						pairedItem: { item: i },
					});
				} else if (operation === 'generateLivePhoto') {
					// Check ffmpeg availability first
					const ffmpegAvailable = await VideoUtils.checkFfmpegAvailable();
					if (!ffmpegAvailable) {
						throw new NodeOperationError(
							this.getNode(),
							'ffmpeg is required for Live Photo generation but is not available on this system. Please install ffmpeg.',
							{ itemIndex: i },
						);
					}

					const credentials = await this.getCredentials('googlePalmApi', i);
					const livePhotoModel = this.getNodeParameter('livePhotoModel', i) as string;
					const livePhotoImageUrl = this.getNodeParameter('livePhotoImageUrl', i) as string;
					const livePhotoEndFrameUrl = this.getNodeParameter('livePhotoEndFrameUrl', i, '') as string;
					const livePhotoPrompt = this.getNodeParameter('livePhotoPrompt', i, '') as string;
					const livePhotoAspectRatio = this.getNodeParameter('livePhotoAspectRatio', i) as string;
					const s3BucketName = this.getNodeParameter('s3BucketName', i) as string;
					const s3PublicDomain = this.getNodeParameter('s3PublicDomain', i, '') as string;
					const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as any;

					// Fetch the start frame image
					const startFrameImage = await VideoUtils.fetchImageForVideo(this, livePhotoImageUrl);
					
					// Optionally fetch end frame if provided
					let endFrameImage = null;
					if (livePhotoEndFrameUrl && livePhotoEndFrameUrl.trim()) {
						endFrameImage = await VideoUtils.fetchImageForVideo(this, livePhotoEndFrameUrl);
					}

					// Initialize Google GenAI
					const ai = new GoogleGenAI({
						apiKey: credentials.apiKey as string,
					});

					// Build prompt - use provided or default (camera/technical focused to avoid safety filters)
					const defaultPrompt = 'Camera slightly adjusts focus, gentle lighting changes, ambient shadows shift';
					const finalPrompt = livePhotoPrompt && livePhotoPrompt.trim()
						? livePhotoPrompt.trim()
						: defaultPrompt;

					// Build config - preset to 720p, with selected aspect ratio
					// Use 8 seconds if end frame provided (required for frames-to-video), 4 seconds otherwise
					const durationForLivePhoto = endFrameImage ? 8 : 4;
					const config: any = {
						numberOfVideos: 1,
						resolution: '720p',
						aspectRatio: livePhotoAspectRatio,
						durationSeconds: durationForLivePhoto,
						personGeneration: 'allow_adult',
					};

					// Build generate video payload
					const generateVideoPayload: any = {
						model: livePhotoModel,
						config,
						prompt: finalPrompt,
						image: startFrameImage,
					};
					
					// Add end frame if provided (for interpolation)
					if (endFrameImage) {
						generateVideoPayload.config.lastFrame = endFrameImage;
					}

					// Start video generation
					let videoOperation = await ai.models.generateVideos(generateVideoPayload);

					// Polling configuration
					const pollingInterval = (additionalOptions.pollingInterval || 10) * 1000;
					const maxWaitTime = (additionalOptions.maxWaitTime || 30) * 60 * 1000;
					const startTime = Date.now();

					// Poll until video generation is complete
					while (!videoOperation.done) {
						if (Date.now() - startTime > maxWaitTime) {
							throw new NodeOperationError(
								this.getNode(),
								`Live photo generation timed out after ${additionalOptions.maxWaitTime || 30} minutes`,
								{ itemIndex: i },
							);
						}

						await new Promise((resolve) => setTimeout(resolve, pollingInterval));
						videoOperation = await ai.operations.getVideosOperation({ operation: videoOperation });
					}

					// Check if generation was successful
					if (!videoOperation.response) {
						throw new NodeOperationError(
							this.getNode(),
							'Live photo generation failed: No response from API',
							{ itemIndex: i },
						);
					}
					
					// Check for error in response (type-safe way)
					const responseAny = videoOperation.response as any;
					if (responseAny.error) {
						throw new NodeOperationError(
							this.getNode(),
							`Live photo generation failed: ${JSON.stringify(responseAny.error)}`,
							{ itemIndex: i },
						);
					}
					
					// Check for safety filter
					if (responseAny.raiMediaFilteredCount && responseAny.raiMediaFilteredCount > 0) {
						const reasons = responseAny.raiMediaFilteredReasons || [];
						throw new NodeOperationError(
							this.getNode(),
							`Live photo generation was blocked by safety filters.\nReasons: ${reasons.join('; ')}\n\nPlease try:\n- Using a different image\n- Modifying or removing the motion prompt\n- Using a more general description`,
							{ itemIndex: i },
						);
					}
					
					// SDK may return either generatedVideos (normalized) or generateVideoResponse.generatedSamples (raw API)
					const generatedSamples = responseAny.generatedVideos || responseAny.generateVideoResponse?.generatedSamples;
					if (!generatedSamples || !Array.isArray(generatedSamples) || generatedSamples.length === 0) {
						throw new NodeOperationError(
							this.getNode(),
							`No videos were generated for live photo. Response: ${JSON.stringify(videoOperation.response).substring(0, 500)}`,
							{ itemIndex: i },
						);
					}

					const firstVideo = generatedSamples[0];
					if (!firstVideo?.video?.uri) {
						throw new NodeOperationError(
							this.getNode(),
							'Generated video is missing URI',
							{ itemIndex: i },
						);
					}

					const videoUri = firstVideo.video.uri ? decodeURIComponent(firstVideo.video.uri) : '';
					if (!videoUri) {
						throw new NodeOperationError(
							this.getNode(),
							'Generated video URI is empty',
							{ itemIndex: i },
						);
					}

					// Fetch the video from Gemini
					const videoResponse = await this.helpers.httpRequest({
						method: 'GET',
						url: `${videoUri}&key=${credentials.apiKey}`,
						returnFullResponse: true,
						encoding: 'arraybuffer',
					});

					// Ensure we have a Buffer
					let videoBuffer: Buffer;
					if (Buffer.isBuffer(videoResponse.body)) {
						videoBuffer = videoResponse.body;
					} else if (typeof videoResponse.body === 'string') {
						videoBuffer = Buffer.from(videoResponse.body, 'binary');
					} else {
						videoBuffer = Buffer.from(videoResponse.body);
					}

					// Process video to create live photo effect with aspect ratio
					// Note: Uses video's first frame for perfect matching
					// Always outputs 5s regardless of input video length (4s or 8s)
					const livePhotoBuffer = await VideoUtils.createLivePhotoVideo(
						this,
						videoBuffer,
						livePhotoAspectRatio,
					);

					// Upload to S3
					const s3Url = await S3Utils.uploadToS3(
						this,
						livePhotoBuffer,
						'video/mp4',
						s3BucketName,
						`${operation}/livephoto_${ulid()}`,
						5,
						s3PublicDomain
					);

					// Prepare result
					const result: any = {
						videoUrl: s3Url,
						fileName: s3Url.split('/').pop(),
						model: livePhotoModel,
						type: 'livePhoto',
						resolution: '720p',
						aspectRatio: livePhotoAspectRatio,
						duration: endFrameImage ? '8s' : '5s',
						usedFramesToVideo: !!endFrameImage,
						imageUrl: livePhotoImageUrl,
						endFrameUrl: livePhotoEndFrameUrl || null,
						prompt: finalPrompt,
						usedDefaultPrompt: !livePhotoPrompt || !livePhotoPrompt.trim(),
					};

					returnData.push({
						json: result,
						pairedItem: { item: i },
					});
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