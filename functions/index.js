const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

// secrets aus firebase (die du mit firebase functions:secrets:set gesetzt hast)
const R2_ACCOUNT_ID = defineSecret("R2_ACCOUNT_ID");
const R2_ACCESS_KEY_ID = defineSecret("R2_ACCESS_KEY_ID");
const R2_SECRET_ACCESS_KEY = defineSecret("R2_SECRET_ACCESS_KEY");
const R2_BUCKET_NAME = defineSecret("R2_BUCKET_NAME");
const R2_PUBLIC_URL = defineSecret("R2_PUBLIC_URL");

exports.uploadPhoto = onCall(
  {
    secrets: [
      R2_ACCOUNT_ID,
      R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY,
      R2_BUCKET_NAME,
      R2_PUBLIC_URL,
    ],
  },
  async (request) => {
    const { data, auth } = request;

    // nur eingeloggte user dürfen hochladen
    if (!auth) {
      throw new HttpsError(
        "unauthenticated",
        "du musst eingeloggt sein um fotos hochzuladen"
      );
    }

    const { fileName, fileBase64, contentType } = data;

    if (!fileName || !fileBase64 || !contentType) {
      throw new HttpsError(
        "invalid-argument",
        "fileName, fileBase64 und contentType sind pflicht"
      );
    }

    // nur bilder erlauben
    if (!contentType.startsWith("image/")) {
      throw new HttpsError(
        "invalid-argument",
        "nur bilddateien sind erlaubt"
      );
    }


    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID.value()}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID.value(),
        secretAccessKey: R2_SECRET_ACCESS_KEY.value(),
      },
    });

    const buffer = Buffer.from(fileBase64, "base64");

    // key = user-id/timestamp-dateiname, damit uploads sortiert & eindeutig sind
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const key = `${auth.uid}/${Date.now()}-${safeFileName}`;

    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME.value(),
          Key: key,
          Body: buffer,
          ContentType: contentType,
        })
      );
    } catch (err) {
      console.error("R2 upload fehlgeschlagen:", err);
      throw new HttpsError("internal", "upload zu R2 fehlgeschlagen");
    }

    const publicUrl = `${R2_PUBLIC_URL.value()}/${key}`;

    return { url: publicUrl, key };
  }
);