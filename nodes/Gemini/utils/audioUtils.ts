export interface WavConversionOptions {
	numChannels: number;
	sampleRate: number;
	bitsPerSample: number;
}

export class AudioUtils {
	/**
	 * Parse MIME type to extract audio format parameters
	 */
	static parseMimeType(mimeType: string): WavConversionOptions {
		const [fileType, ...params] = mimeType.split(';').map((s) => s.trim());
		const [_, format] = fileType.split('/');

		const options: Partial<WavConversionOptions> = {
			numChannels: 1,
		};

		if (format && format.startsWith('L')) {
			const bits = parseInt(format.slice(1), 10);
			if (!isNaN(bits)) {
				options.bitsPerSample = bits;
			}
		}

		for (const param of params) {
			const [key, value] = param.split('=').map((s) => s.trim());
			if (key === 'rate') {
				options.sampleRate = parseInt(value, 10);
			}
		}

		return options as WavConversionOptions;
	}

	/**
	 * Create WAV header
	 */
	static createWavHeader(dataLength: number, options: WavConversionOptions): Buffer {
		const { numChannels, sampleRate, bitsPerSample } = options;

		const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
		const blockAlign = (numChannels * bitsPerSample) / 8;
		const buffer = Buffer.alloc(44);

		buffer.write('RIFF', 0); // ChunkID
		buffer.writeUInt32LE(36 + dataLength, 4); // ChunkSize
		buffer.write('WAVE', 8); // Format
		buffer.write('fmt ', 12); // Subchunk1ID
		buffer.writeUInt32LE(16, 16); // Subchunk1Size (PCM)
		buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
		buffer.writeUInt16LE(numChannels, 22); // NumChannels
		buffer.writeUInt32LE(sampleRate, 24); // SampleRate
		buffer.writeUInt32LE(byteRate, 28); // ByteRate
		buffer.writeUInt16LE(blockAlign, 32); // BlockAlign
		buffer.writeUInt16LE(bitsPerSample, 34); // BitsPerSample
		buffer.write('data', 36); // Subchunk2ID
		buffer.writeUInt32LE(dataLength, 40); // Subchunk2Size

		return buffer;
	}

	/**
	 * Convert raw audio data to WAV format
	 */
	static convertToWav(rawData: string, mimeType: string): Buffer {
		const options = this.parseMimeType(mimeType);
		const dataBuffer = Buffer.from(rawData, 'base64');
		const wavHeader = this.createWavHeader(dataBuffer.length, options);

		return Buffer.concat([wavHeader, dataBuffer]);
	}

	/**
	 * Intelligently split long text into chunks at natural boundaries.
	 * Priority: paragraph break → sentence end → comma/semicolon → word boundary → hard cut.
	 */
	static splitTextIntoChunks(text: string, maxChunkSize: number = 2000): string[] {
		if (!text || text.length <= maxChunkSize) {
			return [text];
		}

		const chunks: string[] = [];
		let remaining = text;

		while (remaining.length > 0) {
			if (remaining.length <= maxChunkSize) {
				const trimmed = remaining.trim();
				if (trimmed.length > 0) {
					chunks.push(trimmed);
				}
				break;
			}

			const window = remaining.substring(0, maxChunkSize);
			let splitIndex = -1;

			// 1. Try paragraph break (\n\n)
			const paragraphIdx = window.lastIndexOf('\n\n');
			if (paragraphIdx > 0) {
				splitIndex = paragraphIdx;
			}

			// 2. Try sentence end (.?!)
			if (splitIndex === -1) {
				for (let j = window.length - 1; j > 0; j--) {
					const ch = window[j];
					if ((ch === '.' || ch === '?' || ch === '!') &&
						(j + 1 >= window.length || window[j + 1] === ' ' || window[j + 1] === '\n')) {
						splitIndex = j + 1;
						break;
					}
				}
			}

			// 3. Try comma or semicolon
			if (splitIndex === -1) {
				for (let j = window.length - 1; j > 0; j--) {
					if (window[j] === ',' || window[j] === ';') {
						splitIndex = j + 1;
						break;
					}
				}
			}

			// 4. Try word boundary (space)
			if (splitIndex === -1) {
				const lastSpace = window.lastIndexOf(' ');
				if (lastSpace > 0) {
					splitIndex = lastSpace;
				}
			}

			// 5. Hard cut as last resort
			if (splitIndex === -1) {
				splitIndex = maxChunkSize;
			}

			const chunk = remaining.substring(0, splitIndex).trim();
			if (chunk.length > 0) {
				chunks.push(chunk);
			}
			remaining = remaining.substring(splitIndex).trim();
		}

		return chunks;
	}

	/**
	 * Concatenate multiple WAV buffers into a single WAV file.
	 * Strips headers from individual buffers, merges raw PCM data,
	 * and creates a unified WAV header.
	 */
	static concatenateWavBuffers(wavBuffers: Buffer[]): Buffer {
		if (wavBuffers.length === 0) {
			return Buffer.alloc(0);
		}

		if (wavBuffers.length === 1) {
			return wavBuffers[0];
		}

		// Read audio parameters from the first WAV header
		const first = wavBuffers[0];
		const numChannels = first.readUInt16LE(22);
		const sampleRate = first.readUInt32LE(24);
		const bitsPerSample = first.readUInt16LE(34);

		// Extract raw PCM data (skip 44-byte WAV header) from each buffer
		const pcmParts: Buffer[] = [];
		let totalPcmLength = 0;
		for (const wav of wavBuffers) {
			const pcm = wav.subarray(44);
			pcmParts.push(pcm);
			totalPcmLength += pcm.length;
		}

		// Build a single WAV with combined PCM data
		const header = this.createWavHeader(totalPcmLength, {
			numChannels,
			sampleRate,
			bitsPerSample,
		});

		return Buffer.concat([header, ...pcmParts]);
	}

	/**
	 * Change playback speed of a WAV buffer by adjusting its sample rate.
	 * Speed > 1.0 = faster, Speed < 1.0 = slower.
	 */
	static changePlaybackSpeed(wavBuffer: Buffer, speed: number): Buffer {
		if (speed === 1.0) {
			return wavBuffer;
		}

		// Clone the buffer so we don't mutate the original
		const result = Buffer.from(wavBuffer);

		// Read original values
		const originalSampleRate = result.readUInt32LE(24);
		const numChannels = result.readUInt16LE(22);
		const bitsPerSample = result.readUInt16LE(34);

		// Calculate new sample rate and byte rate
		const newSampleRate = Math.round(originalSampleRate * speed);
		const newByteRate = (newSampleRate * numChannels * bitsPerSample) / 8;

		// Write updated values into the header
		result.writeUInt32LE(newSampleRate, 24);  // SampleRate
		result.writeUInt32LE(newByteRate, 28);     // ByteRate

		return result;
	}

}