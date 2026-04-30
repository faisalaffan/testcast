import * as fs from 'node:fs';
import type { Readable } from 'node:stream';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { test as base } from '@playwright/test';

export interface S3Fixtures {
  s3Client: S3Client | null;
  s3Operations: {
    upload: (localPath: string, key: string) => Promise<string>; // returns URL
    download: (key: string, localPath: string) => Promise<void>;
    getPresignedUrl: (key: string, expiresIn?: number) => Promise<string>;
  };
}

let s3Client: S3Client | null = null;

export const s3Fixture = base.extend<S3Fixtures>({
  s3Client: async (_, use) => {
    const config = {
      region: process.env.AWS_REGION || 'us-east-1',
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    };

    if (!process.env.AWS_ACCESS_KEY_ID) {
      console.warn('[S3 Fixture] AWS credentials not configured, skipping...');
      await use(null);
      return;
    }

    s3Client = new S3Client(config);
    await use(s3Client);

    // cleanup
    s3Client.destroy();
    s3Client = null;
  },

  s3Operations: async (_, use) => {
    const operations = {
      upload: async (localPath: string, key: string): Promise<string> => {
        if (!s3Client) throw new Error('S3 not configured');
        const buffer = fs.readFileSync(localPath);

        await s3Client.send(
          new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: 'application/octet-stream',
          })
        );

        return `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;
      },

      download: async (key: string, localPath: string): Promise<void> => {
        if (!s3Client) throw new Error('S3 not configured');
        const response = await s3Client.send(
          new GetObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: key,
          })
        );
        return new Promise((resolve, reject) => {
          const stream = response.Body;
          if (!stream) {
            reject(new Error('Empty response body from S3'));
            return;
          }
          const writer = fs.createWriteStream(localPath);
          (stream as Readable).pipe(writer);
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
      },

      getPresignedUrl: async (key: string, expiresIn = 3600): Promise<string> => {
        if (!s3Client) throw new Error('S3 not configured');
        const command = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: key,
        });
        return getSignedUrl(s3Client, command, { expiresIn });
      },
    };

    await use(operations);
  },
});
