# Windows Testing Guide

## For Your Friends Testing the App

### Installation Steps

1. **Download** `BEIT Knowledge Base-0.1.0-setup.exe`

2. **Run the installer**
   - Double-click the .exe file
   - Windows may show "Windows protected your PC" warning
   - Click **"More info"** → **"Run anyway"**
   - Follow the installation wizard

3. **First Launch**
   - App may take 10-15 seconds to start
   - Wait for the window to fully load

---

## If App Doesn't Start - Debugging Steps

### Step 1: Check if Developer Console Opens
- When the app window appears, is there a **developer tools panel** on the right side?
- If YES: Look for **red error messages** in the Console tab

### Step 2: Screenshot Request
Please send screenshots of:
1. The main error message (if any dialog appears)
2. The developer console (if visible) - especially any RED errors
3. The full window showing what you see

### Step 3: Check System Requirements
- **OS**: Windows 10 or 11 (64-bit)
- **RAM**: At least 2GB free
- **Disk**: At least 2GB free space
- **Port 3335**: Must not be used by another program

### Step 4: Check Port Availability
Open Command Prompt and run:
```cmd
netstat -ano | findstr :3335
```
If you see output, another program is using port 3335.

---

## Common Issues & Solutions

### Issue: "Windows protected your PC"
**Solution**: Click "More info" → "Run anyway"
- App is not signed with a Microsoft certificate (costs money)
- The app is safe, this is normal for unsigned apps

### Issue: App window opens but shows error dialog
**Possible causes**:
1. Port 3335 is in use
2. Missing Visual C++ Redistributables
3. Antivirus blocking the app

**Solutions**:
1. Close other programs using port 3335
2. Install [Visual C++ Redistributables](https://aka.ms/vs/17/release/vc_redist.x64.exe)
3. Add app to antivirus exceptions

### Issue: Developer console shows "EADDRINUSE"
**Meaning**: Port 3335 is already in use
**Solution**:
1. Close any other running instances of the app
2. Check Task Manager for "BEIT Knowledge Base" processes
3. End all instances and try again

### Issue: Console shows "libonnxruntime.dll not found"
**Meaning**: Native libraries not packaged correctly
**Solution**: This is a build issue - report back to developer

---

## What to Report Back

Please send us:

1. **Screenshot** of any error dialogs
2. **Screenshot** of developer console if visible (especially red errors)
3. **Windows version**:
   - Open Settings → System → About
   - Note the "Edition" and "Version"
4. **Did the installer run successfully?** (Yes/No)
5. **Can you see the app icon/window?** (Yes/No)
6. **How long did you wait?** (seconds)

---

## Expected Behavior (Working App)

1. **Installer**: Takes 30-60 seconds to extract files
2. **First Launch**:
   - Window opens showing "BEIT Knowledge Base"
   - Loading screen for 10-15 seconds
   - Then shows the main interface with search box
3. **No developer console** should be visible (in final build)
4. **Can search** and see results

---

## Manual Testing Checklist

- [ ] Installer runs without errors
- [ ] Desktop shortcut created
- [ ] Start menu entry created
- [ ] App launches from shortcut
- [ ] Loading screen appears
- [ ] Main UI loads (search box visible)
- [ ] Can type in search box
- [ ] Search returns results (or shows appropriate message)
- [ ] App closes cleanly
- [ ] Can relaunch app successfully

---

**If you see errors, don't uninstall yet!** We need the error details to fix the issue.
