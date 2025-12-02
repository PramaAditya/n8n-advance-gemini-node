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

}