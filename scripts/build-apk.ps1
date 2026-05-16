$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$androidProject = Join-Path $projectRoot "android-twa"
$bubblewrapHome = Join-Path $env:USERPROFILE ".bubblewrap"
$jdkPath = Join-Path $bubblewrapHome "jdk\jdk-17.0.11+9"
$sdkPath = Join-Path $bubblewrapHome "android_sdk"

if (!(Test-Path $androidProject)) {
  throw "android-twa folder was not found. Run Bubblewrap init first."
}

if (!(Test-Path $jdkPath)) {
  throw "Bubblewrap JDK was not found at $jdkPath"
}

if (!(Test-Path $sdkPath)) {
  throw "Bubblewrap Android SDK was not found at $sdkPath"
}

$env:JAVA_HOME = $jdkPath
$env:ANDROID_HOME = $sdkPath
$env:ANDROID_SDK_ROOT = $sdkPath
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

Push-Location $androidProject
try {
  npx @bubblewrap/cli update
  npx @bubblewrap/cli build
} finally {
  Pop-Location
}
