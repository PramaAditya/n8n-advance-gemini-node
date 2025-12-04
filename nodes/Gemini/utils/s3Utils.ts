import { IExecuteFunctions, NodeOperationError } from 'n8n-workflow';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { ulid } from 'ulid';
import mime from 'mime';

export class S3Utils {
	/**
	 * Upload data to S3 with retry logic and exponential backoff
	 */
	static async uploadToS3(
		executeFunctions: IExecuteFunctions,
		data: Buffer,
		mimeType: string,
		bucketName: string,
		fileNamePrefix: string = 'img',
		maxRetries: number = 5,
		publicDomain?: string,
	): Promise<string> {
		const credentials = await executeFunctions.getCredentials('s3');
		
		if (!credentials) {
			throw new NodeOperationError(executeFunctions.getNode(), 'S3 credentials are required for upload but not provided.');
		}

		const region = (credentials.region as string) || 'us-east-1';
		const accessKeyId = credentials.accessKeyId as string;
		const secretAccessKey = credentials.secretAccessKey as string;
		const endpoint = credentials.endpoint as string;
		const forcePathStyle = credentials.forcePathStyle as boolean;
		
		const clientConfig: any = {
			region,
			credentials: {
				accessKeyId,
				secretAccessKey,
			},
			forcePathStyle,
		};

		if (endpoint) {
			clientConfig.endpoint = endpoint;
		}

		const s3Client = new S3Client(clientConfig);
		const fileExtension = mime.getExtension(mimeType) || 'bin';
		const fileName = `${fileNamePrefix}_${ulid()}.${fileExtension}`;
		
		// Use lib-storage Upload for better handling of streams/buffers
		const upload = new Upload({
			client: s3Client,
			params: {
				Bucket: bucketName,
				Key: fileName,
				Body: data,
				ContentType: mimeType,
				ACL: 'public-read',
			},
		});

		let lastError: Error | undefined;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				await upload.done();
				
				// If public domain is provided, use it; otherwise construct standard S3 URL
				let publicUrl = '';
				if (publicDomain && publicDomain.trim()) {
					// Use custom public domain - replace the S3 domain with the custom domain
					const cleanDomain = publicDomain.replace(/\/$/, '');
					publicUrl = `${cleanDomain}/${fileName}`;
				} else {
					// Construct standard S3 URL (original behavior)
					if (endpoint) {
						// Handle custom endpoints
						const cleanEndpoint = endpoint.replace(/\/$/, '');
						if (forcePathStyle) {
							publicUrl = `${cleanEndpoint}/${bucketName}/${fileName}`;
						} else {
							// Virtual-hosted style: http://bucket.endpoint/key
							const protocol = cleanEndpoint.split('://')[0];
							const domain = cleanEndpoint.split('://')[1];
							publicUrl = `${protocol}://${bucketName}.${domain}/${fileName}`;
						}
					} else {
						// Standard AWS S3
						publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}`;
					}
				}
				
				return publicUrl;
			} catch (error) {
				lastError = error;
				// Check for DNS issues or temporary network errors
				const isNetworkError = error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN' || error.name === 'TimeoutError';
				
				if (attempt === maxRetries || !isNetworkError) {
					break; // Don't retry if it's not a network error or we reached max retries
				}
				
				// Exponential backoff: 2^attempt * 100ms (e.g. 200ms, 400ms, 800ms, 1600ms, 3200ms)
				const delay = Math.pow(2, attempt) * 100;
				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}

		throw new NodeOperationError(
			executeFunctions.getNode(),
			`Failed to upload to S3 after ${maxRetries} attempts: ${lastError?.message}`,
		);
	}
}