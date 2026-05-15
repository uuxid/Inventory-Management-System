Set-Location -Path (Join-Path $PSScriptRoot 'android frontend')
Write-Host 'Starting Expo for Expo Go on a physical device.'
Write-Host 'If you want to open an Android emulator with the a key, install the Android SDK and adb first.'
npx expo start -c --tunnel