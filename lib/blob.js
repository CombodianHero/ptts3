/**
 * lib/blob.js
 * Real file storage for payment receipts via Vercel Blob (Part 15 / 39).
 * Requires BLOB_READ_WRITE_TOKEN as a Vercel environment variable.
 */
const { put } = require("@vercel/blob");
const crypto = require("crypto");

const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @param {string} bookingId - human-readable booking id, used in the storage key only
 * @returns {Promise<{url: string, fileName: string}>}
 */
async function uploadReceipt(buffer, mimeType, bookingId) {
  const ext = ALLOWED_TYPES[mimeType];
  if (!ext) {
    throw Object.assign(new Error("Unsupported file type. Please upload JPG, PNG, WEBP, or PDF."), {
      statusCode: 400,
    });
  }
  if (!buffer || buffer.length === 0) {
    throw Object.assign(new Error("Empty file upload."), { statusCode: 400 });
  }
  if (buffer.length > MAX_BYTES) {
    throw Object.assign(new Error("File too large. Maximum size is 8 MB."), { statusCode: 400 });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw Object.assign(
      new Error("File storage is not configured (BLOB_READ_WRITE_TOKEN missing)."),
      { statusCode: 500 }
    );
  }

  const key = `receipts/${bookingId}/${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
  const blob = await put(key, buffer, {
    access: "public", // consider a private store + short-lived signed URLs for stricter access control
    contentType: mimeType,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  return { url: blob.url, fileName: key.split("/").pop() };
}

module.exports = { uploadReceipt, ALLOWED_TYPES, MAX_BYTES };
