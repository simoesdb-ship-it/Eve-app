# How to Publish Your App to Google Play Store from GitHub

## Overview
This guide will help you push your code to GitHub and set up automated Android app builds. Once setup is complete, every time you push code to GitHub, it will automatically build your app files (.apk and .aab) that you can download and upload to the Google Play Store.

## Step 1: Push Your Code to GitHub Using Replit's Git Interface

Since we've already connected GitHub, you can now push your code using Replit's Git pane:

### Option A: Using Replit's Git Pane (Recommended)
1. Look for the **Git** panel in your Replit workspace (usually in the left sidebar under "Tools")
2. You should see all your project files listed under "Changes"
3. Click **"Stage all"** to select all files for the commit
4. In the commit message box, type: `Initial commit: Pattern Discovery App with Android build system`
5. Click the **"Commit & Push"** button

### Option B: Using the Shell
If the Git pane doesn't work, you can use these commands in the Shell:

```bash
# Configure Git (one-time setup)
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Stage all files
git add .

# Commit with a message
git commit -m "Initial commit: Pattern Discovery App with Android build system"

# Push to GitHub
git push -u origin main
```

## Step 2: Set Up GitHub Repository Secrets

Your code includes a GitHub Actions workflow that will automatically build your Android app, but it needs the signing keystore to create the final app file.

1. Go to your GitHub repository: https://github.com/simoesdb-ship-it/Eve-app

2. Click on **"Settings"** (top menu bar)

3. In the left sidebar, click **"Secrets and variables"** → **"Actions"**

4. You should already see `KEYSTORE_BASE64` listed. If not, you need to add these three secrets:

### Required Secrets:

#### KEYSTORE_BASE64
Click **"New repository secret"**
- Name: `KEYSTORE_BASE64`
- Value: (Get this by running the command below in the Replit Shell)

```bash
base64 mobile/android/app/pattern-discovery-release-key.keystore | tr -d '\n'
```

Copy the entire output and paste it as the secret value.

#### KEYSTORE_PASSWORD
- Name: `KEYSTORE_PASSWORD`
- Value: `PatternDiscovery2025!`

#### KEY_ALIAS  
- Name: `KEY_ALIAS`
- Value: `pattern-discovery-key`

5. Click **"Add secret"** for each one

## Step 3: Verify the Automated Build

1. Go to your repository: https://github.com/simoesdb-ship-it/Eve-app

2. Click the **"Actions"** tab at the top

3. You should see a workflow run called "Android Build" 
   - If you just pushed code, it should be running now
   - The workflow takes about 5-10 minutes to complete

4. Wait for the green checkmark ✓ indicating success

## Step 4: Download Your App Files

Once the build completes successfully:

1. Click on the completed workflow run

2. Scroll down to the **"Artifacts"** section at the bottom

3. You'll see two files available for download:
   - **`android-release-apk`** - For testing on your phone
   - **`android-release-aab`** - For uploading to Google Play Store ⭐

4. Click **`android-release-aab`** to download it

5. Extract the ZIP file - inside you'll find `app-release.aab`

## Step 5: Upload to Google Play Console

1. Go to [Google Play Console](https://play.google.com/console/)

2. Click **"Create app"** (or select your existing app if you already created one)

3. Fill in the required information:
   - App name: **Pattern Discovery** (or **Eve** if you prefer)
   - Default language: English
   - App type: App
   - Free or paid: Free

4. Go to **"Production"** → **"Create new release"**

5. Click **"Upload"** and select the `app-release.aab` file you downloaded

6. Fill in the release notes (describe what's in this version)

7. Complete the required store listing information:
   - App description
   - Screenshots (you'll need to take these from your app)
   - App icon
   - Feature graphic
   - Privacy policy URL (if required)

8. Submit for review!

## Future Updates

Once everything is set up, updating your app is simple:

1. Make changes to your code in Replit
2. Push to GitHub (using Git pane or shell commands)
3. GitHub Actions automatically builds new .aab file
4. Download the new .aab from Actions → Artifacts
5. Upload to Google Play Console as a new release

## Important Notes

⚠️ **Backup Your Keystore**: The file `mobile/android/app/pattern-discovery-release-key.keystore` is **CRITICAL**. If you lose it, you can never update your app on the Play Store. Keep a backup in a safe place!

🔑 **Keep Secrets Safe**: Never share your keystore password or the keystore file publicly.

📱 **Testing**: Use the .apk file to test on your phone before submitting to the Play Store. The .aab file is only for the Play Store.

## Troubleshooting

### Build fails in GitHub Actions
- Check that all three secrets are set correctly
- Make sure the KEYSTORE_BASE64 is the complete output with no line breaks

### Can't find Actions tab
- Make sure you pushed your code to GitHub first
- The workflow file `.github/workflows/android-build.yml` must be in your repository

### Git push fails
- You may need to authenticate with GitHub using a Personal Access Token
- Contact GitHub support if you're having authentication issues

## Need Help?

If you get stuck at any step, you can:
1. Check the GitHub Actions build logs for error messages
2. Review the Google Play Console documentation
3. Ask for help with the specific error message you're seeing
