#!/bin/bash
echo "✅ Copying generated Release APK from Android Studio..."
cp android/app/build/outputs/apk/release/app-release.apk public/yashubeatztv
cp android/app/build/outputs/apk/release/app-release.apk public/yashubeatztv.apk

echo "🚀 Deploying to Vercel..."
npx vercel --prod --yes

echo "🎉 Done! The new APK is live on Vercel (downloads automatically as .apk)"
