import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Uploads a file to AWS S3 and returns the public URL
 * @param {string} filePath - Local path to the file
 * @param {string} fileName - Desired name in S3
 * @param {string} mimeType - File type (e.g., 'application/pdf')
 * @returns {Promise<string>} - The public URL of the uploaded file
 */
export const uploadToS3 = async (filePath, fileName, mimeType) => {
  const fileStream = fs.createReadStream(filePath);

  const uploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `notes/${fileName}`, 
    Body: fileStream,
    ContentType: mimeType,
  };

  try {
    await s3Client.send(new PutObjectCommand(uploadParams));
    
    // Construct the public URL
    const url = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/notes/${fileName}`;
    return url;
  } catch (error) {
    console.error("S3 Upload Error:", error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
};