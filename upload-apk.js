const admin = require('firebase-admin');
const fs = require('fs');

// NOTE: The service account credentials are no longer stored directly in this repository.
// Place a copy of your Firebase service account JSON (downloaded from the Firebase console)
// in the project root as "serviceAccountKey.json" and add it to .gitignore.
// Alternatively, point to a custom location via the GOOGLE_SERVICE_ACCOUNT_PATH env var.

const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json';
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "youtube-tv-control-2026.firebasestorage.app"
});

async function uploadApk() {
    try {
        const bucket = admin.storage().bucket();
        const filePath = './youtube-tv.apk';
        const destFileName = 'youtube-tv.apk';
        
        console.log('Uploading ' + filePath + ' to Firebase Storage...');
        
        const [file] = await bucket.upload(filePath, {
            destination: destFileName,
            metadata: {
                contentType: 'application/vnd.android.package-archive',
            }
        });
        
        await file.makePublic();
        
        const url = `https://storage.googleapis.com/${bucket.name}/${destFileName}`;
        console.log('UPLOAD_SUCCESS:' + url);
    } catch (err) {
        console.error('Upload failed:', err);
    }
}

uploadApk();
