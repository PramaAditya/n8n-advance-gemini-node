import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { ImageUtils } from './imageUtils';

export interface VideoGenerationImage {
	imageBytes: string;
	mimeType: string;
}

export interface VideoObject {
	uri: string;
}

export class VideoUtils {
	/**
	 * Fetch image from URL and convert to format needed for video generation
	 */
	static async fetchImageForVideo(
		executeFunctions: IExecuteFunctions,
		imageUrl: string,
	): Promise<VideoGenerationImage> {
		if (!imageUrl || !imageUrl.trim()) {
			throw new NodeOperationError(
				executeFunctions.getNode(),
				'Image URL cannot be empty',
			);
		}

		try {
			const { data, mimeType } = await ImageUtils.urlToBase64WithMimeType(
				executeFunctions,
				imageUrl,
			);

			return {
				imageBytes: data,
				mimeType,
			};
		} catch (error) {
			throw new NodeOperationError(
				executeFunctions.getNode(),
				`Failed to fetch image from URL: ${imageUrl}. Error: ${error.message}`,
			);
		}
	}

	/**
	 * Create a Video object from URI for extend video mode
	 */
	static createVideoObject(videoUri: string): VideoObject {
		if (!videoUri || !videoUri.trim()) {
			throw new Error('Video URI cannot be empty');
		}

		const trimmedUri = videoUri.trim();

		// Validate URI format (should be a Gemini files API URI)
		// Accept both full URLs and just the files path
		const isValidFormat =
			trimmedUri.includes('generativelanguage.googleapis.com') ||
			trimmedUri.startsWith('files/') ||
			trimmedUri.match(/^[a-zA-Z0-9_-]+$/); // Just the file ID

		if (!isValidFormat) {
			throw new Error(
				`Invalid video URI format. Expected a Gemini files API URI like:\n` +
				`- Full URL: https://generativelanguage.googleapis.com/v1beta/files/abc123\n` +
				`- Files path: files/abc123\n` +
				`- File ID: abc123\n` +
				`Received: ${trimmedUri.substring(0, 100)}...`
			);
		}

		// If it's just a file ID, construct the full path
		let finalUri = trimmedUri;
		if (trimmedUri.match(/^[a-zA-Z0-9_-]+$/)) {
			finalUri = `files/${trimmedUri}`;
		}

		return {
			uri: finalUri,
		};
	}

	/**
	 * Fetch multiple reference images for video generation
	 */
	static async fetchReferenceImages(
		executeFunctions: IExecuteFunctions,
		referenceImageUrls: string[],
	): Promise<VideoGenerationImage[]> {
		const images: VideoGenerationImage[] = [];

		for (const url of referenceImageUrls) {
			if (url && url.trim()) {
				const image = await this.fetchImageForVideo(executeFunctions, url);
				images.push(image);
			}
		}

		return images;
	}

	/**
	 * Validate video generation parameters based on mode
	 */
	static validateParameters(
		executeFunctions: IExecuteFunctions,
		mode: string,
		params: any,
	): void {
		switch (mode) {
			case 'textToVideo':
				if (!params.videoPrompt || !params.videoPrompt.trim()) {
					throw new NodeOperationError(
						executeFunctions.getNode(),
						'Video prompt is required for text-to-video mode',
					);
				}
				break;

			case 'framesToVideo':
				if (!params.startFrameUrl || !params.startFrameUrl.trim()) {
					throw new NodeOperationError(
						executeFunctions.getNode(),
						'Start frame URL is required for frames-to-video mode',
					);
				}
				break;

			case 'referencesToVideo':
				if (!params.referenceImages || params.referenceImages.length === 0) {
					throw new NodeOperationError(
						executeFunctions.getNode(),
						'At least one reference image is required for references-to-video mode',
					);
				}
				break;

			case 'extendVideo':
				if (!params.inputVideoUri || !params.inputVideoUri.trim()) {
					throw new NodeOperationError(
						executeFunctions.getNode(),
						'Input video URI is required for extend-video mode',
					);
				}
				break;

			default:
				throw new NodeOperationError(
					executeFunctions.getNode(),
					`Unknown generation mode: ${mode}`,
				);
		}
	}

	/**
	 * Extract file ID from Gemini video URI
	 */
	static extractFileIdFromUri(uri: string): string {
		const match = uri.match(/files\/([^/?]+)/);
		if (match && match[1]) {
			return match[1];
		}
		throw new Error(`Could not extract file ID from URI: ${uri}`);
	}

	/**
	 * Build video generation config based on parameters
	 */
	static buildVideoConfig(params: {
		resolution: string;
		aspectRatio?: string;
		numberOfVideos?: number;
	}): any {
		const config: any = {
			numberOfVideos: params.numberOfVideos || 1,
			resolution: params.resolution,
		};

		// Only add aspect ratio if provided (not for extend mode)
		if (params.aspectRatio) {
			config.aspectRatio = params.aspectRatio;
		}

		return config;
	}

	/**
	 * Format video duration (if available from metadata)
	 */
	static formatDuration(seconds: number): string {
		if (!seconds || seconds < 0) {
			return 'unknown';
		}

		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);

		if (mins > 0) {
			return `${mins}m ${secs}s`;
		}
		return `${secs}s`;
	}

	/**
	 * Remove audio from video using ffmpeg (if available)
	 * Returns the processed buffer, or original buffer if ffmpeg fails
	 */
	static async removeAudioFromVideo(
		executeFunctions: IExecuteFunctions,
		videoBuffer: Buffer,
	): Promise<{ buffer: Buffer; audioRemoved: boolean }> {
		const { exec } = await import('child_process');
		const { promisify } = await import('util');
		const { writeFile, unlink } = await import('fs/promises');
		const { tmpdir } = await import('os');
		const { join } = await import('path');
		
		const execAsync = promisify(exec);
		
		const tempId = Date.now();
		const inputPath = join(tmpdir(), `input_${tempId}.mp4`);
		const outputPath = join(tmpdir(), `output_${tempId}.mp4`);

		try {
			// Write input video to temp file
			await writeFile(inputPath, videoBuffer);

			// Try to remove audio using ffmpeg
			// -an: remove audio stream
			// -c:v copy: copy video stream without re-encoding (faster)
			await execAsync(
				`ffmpeg -i "${inputPath}" -c:v copy -an "${outputPath}"`,
				{ timeout: 60000 } // 60 second timeout
			);

			// Read the processed video
			const { readFile } = await import('fs/promises');
			const processedBuffer = await readFile(outputPath);

			// Clean up temp files
			try {
				await unlink(inputPath);
				await unlink(outputPath);
			} catch (cleanupError) {
				// Ignore cleanup errors
			}

			return { buffer: processedBuffer, audioRemoved: true };
		} catch (error) {
			// Clean up temp files on error
			try {
				await unlink(inputPath).catch(() => {});
				await unlink(outputPath).catch(() => {});
			} catch (cleanupError) {
				// Ignore cleanup errors
			}

			// Return original buffer if ffmpeg fails
			return { buffer: videoBuffer, audioRemoved: false };
		}
	}

	/**
	 * Check if ffmpeg is available on the system
	 */
	static async checkFfmpegAvailable(): Promise<boolean> {
		const { exec } = await import('child_process');
		const { promisify } = await import('util');
		const execAsync = promisify(exec);

		try {
			await execAsync('ffmpeg -version', { timeout: 5000 });
			return true;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Process video for Live Photo effect:
	 * 1. Trim to 3 seconds
	 * 2. Add crossfade back to the original image
	 * 3. Mute audio
	 * 
	 * This mimics iOS Live Photos behavior
	 */
	static async createLivePhotoVideo(
		executeFunctions: IExecuteFunctions,
		videoBuffer: Buffer,
		imageBuffer: Buffer,
	): Promise<Buffer> {
		const { exec } = await import('child_process');
		const { promisify } = await import('util');
		const { writeFile, unlink, readFile } = await import('fs/promises');
		const { tmpdir } = await import('os');
		const { join } = await import('path');
		
		const execAsync = promisify(exec);
		
		const tempId = Date.now();
		const videoPath = join(tmpdir(), `livephoto_video_${tempId}.mp4`);
		const imagePath = join(tmpdir(), `livephoto_image_${tempId}.jpg`);
		const outputPath = join(tmpdir(), `livephoto_output_${tempId}.mp4`);

		try {
			// Write input files to temp
			await writeFile(videoPath, videoBuffer);
			await writeFile(imagePath, imageBuffer);

			// FFmpeg command to:
			// 1. Trim video to 3 seconds
			// 2. Scale image to match video dimensions
			// 3. Create crossfade effect back to the starting image (0.5s fade)
			// 4. Remove audio
			//
			// The effect: video plays for 2.5s, then crossfades to the still image over 0.5s
			const ffmpegCmd = `ffmpeg -i "${videoPath}" -loop 1 -t 0.5 -i "${imagePath}" ` +
				`-filter_complex "` +
				`[0:v]trim=duration=3,setpts=PTS-STARTPTS[v0]; ` +
				`[v0]split[v1][v2]; ` +
				`[v1]trim=duration=2.5[v1trim]; ` +
				`[v2]trim=start=2.5:duration=0.5,setpts=PTS-STARTPTS[v2trim]; ` +
				`[1:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setpts=PTS-STARTPTS[img]; ` +
				`[v2trim][img]xfade=transition=fade:duration=0.5:offset=0[fade]; ` +
				`[v1trim][fade]concat=n=2:v=1:a=0[outv]` +
				`" -map "[outv]" -an -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p "${outputPath}"`;

			await execAsync(ffmpegCmd, { timeout: 120000 }); // 2 minute timeout

			// Read the processed video
			const processedBuffer = await readFile(outputPath);

			// Clean up temp files
			try {
				await unlink(videoPath);
				await unlink(imagePath);
				await unlink(outputPath);
			} catch (cleanupError) {
				// Ignore cleanup errors
			}

			return processedBuffer;
		} catch (error) {
			// Clean up temp files on error
			try {
				await unlink(videoPath).catch(() => {});
				await unlink(imagePath).catch(() => {});
				await unlink(outputPath).catch(() => {});
			} catch (cleanupError) {
				// Ignore cleanup errors
			}

			throw new Error(`Failed to create live photo video: ${error.message}`);
		}
	}
}