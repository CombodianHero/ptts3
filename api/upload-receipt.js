/**
 * POST /api/upload-receipt
 *
 * PLACEHOLDER — API INTEGRATION POINT.
 * ------------------------------------------------------------
 * The static demo (js/payment.js) stores uploaded receipts as
 * base64 data URLs in the browser's localStorage, purely so the
 * single-page demo works with zero backend. That is NOT
 * appropriate for production: local storage is per-browser,
 * unencrypted, and has a small size limit.
 *
 * A real implementation must:
 *  1. Accept a multipart/form-data upload (or a pre-signed URL
 *     upload direct to storage).
 *  2. Store the file in real object storage (e.g. Vercel Blob,
 *     S3, Cloudinary) — not in a database column and not in the
 *     browser.
 *  3. Save only the file's URL/metadata against the booking in
 *     your real database.
 *  4. Set the booking status to RECEIPT_UPLOADED, then
 *     PENDING_ADMIN_VERIFICATION.
 *
 * This stub simply acknowledges the request.
 */
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // TODO (production): parse multipart form data and persist the
  // file to real object storage here.

  res.status(200).json({
    received: true,
    demo: true,
    note: "This is a placeholder — the working demo instead stores receipts in the browser via localStorage (see js/payment.js).",
  });
};
