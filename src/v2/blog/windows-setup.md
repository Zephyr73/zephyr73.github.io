---
layout: base.njk
permalink: /blog/windows-setup/
title: How I setup my windows 11 desktop
description: This is a step by step process on how I configure my windows 11 desktop and some network configurations. This is in case I forget how I set them up
pageId: 3
tags: blogpost
category: Technical Guide
date: 2026-09-19
---

# Step by step process of my windows setup

## Step 1: Installation & Media Setup

Before you start the guide, make sure to download a copy of Windows 11 ISO. I would suggest downloading the ISO of last year, usually they are more polished from my personal experience. So for example, as of today the latest version of Windows 11 is **25H2**, which is what I am currently running. In some rare cases the newer version might be more polished and have less bugs on release, in that case download the latest one. Do your research to find the most stable version.

After downloading the ISO, download my [autounattend.xml][autounattend.xml]. You can import this file in <https://schneegans.de/windows/unattend-generator/> and inspect it to add or remove settings. I would always suggest creating an autounattend file because it will install an almost clean Windows without you having to manually uninstall bloatware and change settings.

Once you have both of these files, burn the ISO in a USB stick using **Rufus**. After the iso is installed in the USB stick, copy the `autounattend.xml` file and paste it in the root directory of the USB.

Restart your PC and boot into the USB to go through the windows setup. The process should be almost hands-free because of the unattend file.

## Step 2: Initial Setup & Base Configuration

### Display & Drivers

- Download GPU Display Drivers
  - For NVIDIA GPU users:
    - Download NVIDIA driver **596.36** (current most stable version for me)
    - Debloat via NVCleanstall
  - For AMD/Intel GPU users:
    - Download the latest stable driver, or use debloated variants where available
- Set Display resolution and refresh rates
- Set color depth in NVIDIA Control Panel or AMD Radeon Software
- Apply per-monitor OSD settings from [this Monitor Settings sheet]

> In the case where windows automatically downloads the GPU drivers, follow the steps:
>
> - Download the GPU drivers from the manufacturer's website
> - Boot into safe mode
> - Uninstall GPU drivers using **DDU**
> - Unplug LAN cable or disable WiFi
> - Restart your PC
> - Install the GPU drivers manually
> - Plug LAN cable or enable WiFi

### Windows Settings

Even after installing windows with the unattend file, the default settings of windows are a privacy nightmare.

- System
  - Display
    - **Apply** Color Profile
    - **Disable** Automatically manage color for apps
    - **Disable** HDR
  - Sound
    - Change Default sound devices
    - Headphones
      - Change Default format to highest quality
      - **Enable** Audio Enhancements
      - **Disable** Spatial Sound
    - Microphone
      - **Disable** Listen to device
      - Default playback device
  - Notifications
    - **Disable** notifications
    - **Enable** Do not Disturb
  - Power
    - Never turn off display
  - Storage
    - **Disable** storage sense
  - Nearby Sharing: **OFF**
  - Advanced
    - Long Paths: **ON**
    - Remote Desktop: **OFF**
    - Terminal: Windows Terminal
    - Developer Mode: **ON**
    - Device Discovery: **OFF**
  - Optional Features
    - OpenSSH Client
    - OpenSSH Server
    - More Windows Features
      - SMB Direct
      - Virtual Machine Platform (Optional)
      - Windows Sandbox (Optional)
- Network & Ethernet
  - Private Network
- Apps
  - Uninstall bloatware if there is any
- Accounts
  - Make sure to use a local account
- Gaming
  - Game Bar
    - Allow controller to open Game bar: **OFF**
  - Captures
    - **Disable** captures
  - Game mode: **OFF**
- Privacy & Security
  - **Disable** almost everything unless you need it

### Network Configuration

For some reasons, my PC used to drop connection at random times after I switched to gigabit internet. It usually happened when I am playing games or when I am in a voice call. Weird issue, never found the exact reason for it, however I fixed them by changing these settings after doing some research.

#### Device Manager

Go to **Ethernet > Properties > Advanced** and change the following settings

- Advanced EEE: **Disabled**
- ARP Offload: **Enabled**
- Auto Disable Gigabit: **Disabled**
- Energy-Efficient Ethernet: **Disabled**
- Flow Control: **Rx & Tx Enabled**
- Gigabit Lite: **Enabled**
- Green Ethernet: **Enabled**
- Interrupt Moderation: **Enabled**
- IPv4 Checksum Offload: **Rx & Tx Enabled**
- Power Saving Mode: **Disabled**

> #### Personal Note
>
> Device IP Address should be managed by AdGuard/PiHole, however in the case it is not set appropriately:
>
> - Go to **Control Panel > Network and Internet > Network and Sharing Center > Ethernet > Properties > IPv4**
> - set the device ip to `192.168.1.xxx`
>
> > **Note**
> > For a list of IP and Ports in case of a network reset, refer to the `ip-and-ports.md` [handbook][ip-and-ports].

## Step 3: Debloating & Service Optimization

### Chris Titus Tool

Copy and paste this in `PowerShell`:

```powershell
irm "https://christitus.com/win" | iex
```

From the **TWEAKS** tab

- Remove Widgets
- Set services to manual
- Adobe Network Block
- Brave Debloat
- Disable Microsoft Copilot
- Set Classic Right-Click Menu

- Bing Search in Start Menu: **OFF**
- Center Taskbar Items: **OFF**
- Cross-Device Resume: **OFF**
- Detailed BSoD: **OFF**
- Disable Multiplane Overlay: **ON**
- Modern Standby Fix: **ON**
- Mouse Acceleration: **OFF**
- Recommendations in Start Menu: **OFF**
- Show File Extensions: **ON**
- Show Hidden Files: **ON**

> For PC, you may want to **Add and Activate Ultimate Performance Profile**

From the **UPDATES** tab, select Security Settings. This should delay feature updates by 1 year, and security updates by 1 week.

### SysInternals: Autoruns

Go through all the tabs and make sure there are no hidden tasks or services running. Even though we set all services to manual from **Chris Titus Tool**, some services may be overlooked by it. You can double check the services, and tasks created by various apps.

Use this tool to help you with the next app, **Task Scheduler**

### Task Scheduler Audit

Many apps love to hide their automated scripts over here (Auto update, auto install etc). I personally turn off all auto update tasks created by Microsoft and other Browsers. Most of the services are generally safe to turn off, however it is best to do your own research.

### Brave Debloat

Brave is installed **machine-wide** (`C:\Program Files\BraveSoftware\Brave-Browser`). Combined with the built-in **Brave Debloat** tweak in the Chris Titus tool, I remove the bloat as follows:

#### Debloat Settings

- Debloat (turn OFF / remove):
  - Brave News
  - Side panel / sidebar
  - AI Chat, Brave Rewards, Wallet & VPN - enforced via **registry policies** (see below)
  - WebRTC IP handling: **disable non-proxied UDP**
- Privacy: **Sign in / Sync disabled** (local profile)

#### Registry Policies (Debloat)

AI Chat, Wallet, VPN & Rewards are disabled through **Group Policy registry keys**, which survive Brave resets and re-enables better than toggles alone. Create the key and set the `DWord` values:

```powershell
New-Item -Path "HKCU:\Software\Policies\BraveSoftware\Brave" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Policies\BraveSoftware\Brave" -Name "BraveAIChatEnabled" -Value 0 -Type DWord
Set-ItemProperty -Path "HKCU:\Software\Policies\BraveSoftware\Brave" -Name "BraveWalletDisabled" -Value 1 -Type DWord
Set-ItemProperty -Path "HKCU:\Software\Policies\BraveSoftware\Brave" -Name "BraveVPNDisabled" -Value 1 -Type DWord
Set-ItemProperty -Path "HKCU:\Software\Policies\BraveSoftware\Brave" -Name "BraveRewardsDisabled" -Value 1 -Type DWord
```

Apply the registry debloat above (or merge [Brave-Debloat.reg]) after setting up Brave, so AI Chat, Wallet, VPN & Rewards stay stripped even after a reset.

#### Context Menu Bloat Removal

Brave adds a bunch of items to its right-click context menu. Since these are removed per menu (right-click an item then **Remove**), they cannot be restored by a config file - do it manually after a fresh install, together with the toggle-driven items above.

## Step 4: Software Installation & System Environment

### Software Downloads

Everything listed here is available through `winget` unless stated otherwise. Apps and games that are not listed here are re-downloadable any time with their configs synced cloud-side.

- **Drivers**
  - NVIDIA Driver (debloated via [NVCleanstall])
  - NVIDIA App
  - Realtek Ethernet + Realtek Audio Control
  - [VB-CABLE] (Virtual Audio Cable)

- **Dev / IDEs**
  - Git
  - [uv] (Python version manager)
  - Python
  - Node.js
  - MSYS2
  - JDK 17 + JDK 21
  - VS Code (with the extensions listed below)
  - IntelliJ IDEA
  - Antigravity IDE

- **Apps**
  - Discord with [Vencord][Vencord]
  - Steam with [Millennium][Millenium]
  - [Apollo]
  - Cheat Engine
  - LM Studio
  - opencode
  - Brave Browser (Debloated, instructions below)

- **Customization**
  - Nilesoft Shell
  - Translucent Taskbar
  - Explorer Patcher
  - Windhawk
  - Rainmeter
  - Oh My Posh
  - Clink
  - Fonts
    - JetBrainsMono Nerd Font
    - Iosevka

- **Tools**
  - 7-Zip
  - Sysinternals Suite
  - Notepad++
  - OnlyOffice
  - DisplayCAL
  - PowerToys
  - fastfetch
  - TreeSize
  - DefenderUI
  - Malwarebytes
  - qBittorrent
  - MSI Afterburner
  - Core Temp
  - CrystalDiskInfo

- **Connectivity**
  - Tailscale
  - KDE Connect
  - WinSCP
  - RustDesk

- **Portable Apps** (`D:\Portable Apps`) - not installed, kept portable:
  - Bulk Crap Uninstaller (BCU)
  - OpenRGB
  - platform-tools (adb/fastboot)
  - Syncthing
  - Everything
  - ventoy
  - DriverStoreExplorer
  - usblogview
  - scrcpy
  - ArchiSteamFarm (ASF)
  - Glance Dashboard
  - Caddy

### Hardware & Calibration Utilities

- Use **MSI Afterburner** to undervolt GPU and make sure to launch in startup
- Change **NVIDIA Control Panel** settings according to updated guide
- Turn off game optimization in **NVIDIA App**
- Use **DefenderUI** to control Microsoft Defender settings
- Install **Core Temp** and **CrystalDiskInfo** to monitor your system

#### DisplayCal

The reason we will be using DisplayCal is because the default Windows Color Management program is not known to be reliable for handling color profiles. It glitches out especially when you switch to and from full screen mode, sometimes after a reboot it fails to load the color profile immediately. This is where DisplayCal comes in clutch, it makes sure the profile is always automatically loaded.

After installing and setting up **DisplayCal**, download the calibrated `.icc` or `.icm` profiles for your monitor. YouTubers like _Techless_ and _Monitor Unboxed_ usually provide calibrated profiles for popular monitors, or grab mine from [this ICC/ICM profiles Drive folder]. Once you download the color profiles, right click on them and select **Install Profile** from the context menu.

Once you have everything ready, search for **Color Management** in windows search. On the top of the settings screen, it should show your monitors. Make sure to select the correct monitor. Once you select your monitor, click on the tickbox that says **Use my settings for this device**.

On the bottom left of the settings screen, you should see an **Add...** button, click on it and you should see a lot of color profiles, from here select the one you installed earlier. Once you add the profile, it should already be set as default. However, just to be safe, click on the profile again and click **Set as Default Profile** just to be safe.

After setting up the color profile in Windows Color Management, go to your system tray and right click the **DisplayCal** icon and click on **Profile Associations**. _The icon should be there if you installed **DisplayCal**, Do not launch **DisplayCal** App unless you are using hardware to calibrate your monitor_. **DisplayCal** should automatically select the profile for you, but double check if it is the correct profile. On the bottom left, click on **Automatically fix profile associations**

### System Environment

> Follow the instructions from [this handbook]

## Step 5: App Customization & Automation

### Terminal & Shell

#### Oh My Posh & Clink

Oh My Posh is needed to theme the terminal ui, Clink is used for suggestions and more advanced but helpful features.

Download **Oh My Posh** using the following command:

```powershell
winget install JanDeDobbeleer.OhMyPosh --source winget
```

Download **Clink** using the following command:

```powershell
winget install chrisant996.Clink
```

To locally download the themes for **Oh My Posh**, go to [the release page](https://github.com/JanDeDobbeleer/oh-my-posh/releases/), and download the `themes.zip` file.
Extract the themes.zip file in `~/Documents/OhMyPosh themes/`

To change your theme for **PowerShell**, open **PowerShell** and type:

```powershell
notepad $PROFILE
```

This will create a Profile for PowerShell in one of these locations

- `$HOME\Documents\Powershell\Microsoft.PowerShell_profile.ps1` (For PowerShell 7)
- `$HOME\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1` (For PowerShell 5.1)

Download your favorite theme for **Oh My Posh** and save it in `Documents`, and to apply it, enter the following in the **PowerShell** profile:

```powershell
oh-my-posh init pwsh --config '$HOME/Documents/OhMyPosh themes/catppuccin_mocha.omp.json' | Invoke-Expression
```

Once altered, reload your profile for the changes to take effect:

```powershell
. $PROFILE
```

My profile also includes **Python venv auto-activation** - it auto-enables the `.venv` of whichever project directory you `cd` into, and deactivates it when you leave. The helper functions in `Microsoft.PowerShell_profile.ps1` look like this:

```powershell
function global:Activate-ProjectVenv {
    $activate = Join-Path (Get-Location) '.venv\Scripts\Activate.ps1'
    if (-not (Test-Path $activate)) { return $false }
    if ($env:VIRTUAL_ENV) { deactivate }
    . $activate
    return $true
}

function global:Set-LocationWithVenv {
    param([Parameter(Position = 0, Mandatory = $true)][string]$Path, [switch]$PassThru)
    if ($env:VIRTUAL_ENV) { deactivate }
    Set-Location -Path $Path
    Activate-ProjectVenv | Out-Null
}

Remove-Item -Force alias:cd -ErrorAction SilentlyContinue
Set-Alias -Name cd -Value Set-LocationWithVenv -Force
Activate-ProjectVenv | Out-Null
```

For **Command Prompt**, **Clink** loads `oh-my-posh.lua` from its install directory (`C:\Program Files (x86)\clink`). Edit that file and paste the following:

```lua
load(io.popen('oh-my-posh init cmd --config "%USERPROFILE%/Documents/OhMyPosh themes/catppuccin_mocha.omp.json"'):read("*a"))()
```

Restart your Command Prompt to see the difference.

#### Windows Terminal

You can either import the config from the [Windows Terminal settings.json][wt-config], or have a fresh start.
Here are some settings which I recommend to change:

- Profile defaults
  - Color scheme: **Custom_Palette** (add it to your `schemes`)
  - Font: **JetBrainsMono Nerd Font Mono**, Size: **11**
  - Background Opacity: **80%** (Acrylic)
  - Window Padding: **30**
  - `adjustIndistinguishableColors`: **indexed**
  - `elevate`: **ON**
- Launch mode: **Focus** (opens maximized without the title bar)
- Center on Launch: **ON**
- Profiles
  - PowerShell: command line `powershell.exe -nologo`
  - Default profile: **Command Prompt**

#### CMD.exe

Right click the title bar and then change the settings for the following

##### Default

- Font
  - **Size:** 18
  - **Font:** JetBrainsMono Nerd Font Mono
- Layout
  - Screen Buffer Size
    - **Width:** 127
    - **Height:** 9001
    - Wrap text output on resize
  - Window Size
    - **Width:** 127
    - **Height:** 32
  - Window Position
    - **Left:** 696
    - **Top:** 357

##### Properties

- Font
  - **Size:** 18
  - **Font:** JetBrainsMono Nerd Font Mono
- Layout
  - Screen Buffer Size
    - **Width:** 127
    - **Height:** 9001
    - Wrap text output on resize
  - Window Size
    - **Width:** 127
    - **Height:** 32
  - Window Position
    - **Left:** 696
    - **Top:** 357
- Colors
  - **Opacity:** 97%

### Desktop Customization

#### Nilesoft Shell

Copy paste the config files from [the Nilesoft Shell folder][nilesoft-folder] into `C:\Program Files\Nilesoft Shell\` (overwrite the default `shell.nss` and drop the `.nss` files in `imports\`).

The config adds a few helpful items to the context menu, including a **Copy share URL** item that uploads the selected file/folder through [File.io] and copies the share link to your clipboard.

#### Translucent Taskbar

Everything should be at default settings except
**Desktop > Acrylic**
**Maximized window > Acrylic**

#### Explorer Patcher

Import the [ExplorerPatcher.reg][ep-config] config file, OR apply these main settings:

##### Taskbar

- Taskbar Style: **Windows 11**
- Multi-Monitor Taskbar Alignment: **One taskbar per monitor**
- Search: **Hidden**
- Show Task View Button: **OFF**

##### File Explorer

- Disable the windows 11 context menu: **OFF**
- Use classic drive groupings in this PC: **OFF**
  - Control Interface: **Windows 10 Ribbon**

##### Other

- Start button: **Orb** (`OrbStyle = 1`)
- Skin menus, center menus, flyout menus: **ON**

#### Windhawk

Install the mods below. Their theme/configuration JSON files live in the [Windhawk folder][windhawk-folder] along with a [MODS.md][windhawk-mods] that documents the active set.

**Active mods**

- Windows 11 Start Menu Styler
- Windows 11 Taskbar Styler
- Windows 11 Notification Center Styler
- Slick Window Arrangement
- Start Menu Size
- Themed RegEdit ListView

**Currently disabled**

- Taskbar on Top
- Windows 11 File Explorer Styler
- Translucent Windows

Go to **Settings > Advanced Settings > More Advanced Settings**
In the **Process inclusion list** enter `dwm.exe`
Save and Restart Windhawk

##### Slick window arrangement

- Slick windows distance: 25

##### Windows 11 Start Menu Styler

My config uses a monochrome, square-corners look. The full config is in `Win11MonochromeV2.json` in the [Windhawk folder][windhawk-folder]. Paste the contents into **Settings > Details** of the mod. Alternative themes (`minimal-*.json`, `glassy-minimal-*.json`) are included.

### Applications & Editors

#### VS Code

Import the [settings.json][vscode-config], and install the following extensions:

- C/C++
- C/C++ Extension Pack
- C/C++ DevTools
- Catppuccin for VSCode
- clangd
- CMake Tools
- Code Runner
- Debug Visualizer
- Doxygen Documentation Generator
- GitHub Theme
- GitHub Actions
- Gruvbox Theme
- Hex Editor
- json
- Jupyter
- Jupyter Cell Tags
- Jupyter Keymap
- Jupyter Notebook Renderers
- Jupyter Slide Show
- Language Support for Java(TM) by Red Hat
- Live Sass Compiler
- Live Server
- Markdown Preview Enhanced
- Markdownlint
- Material Icon Theme
- Monochrome Theme
- Nunjucks
- One Dark Pro / Monokai Darker
- Open in Github, Bitbucket, Gitlab
- Project Tree
- Pylance
- Python
- Python debugger
- Python Environments
- Python Preview
- Remote - SSH
- Remote - SSH: Editing Configuration Files
- Roo Cline
- Ruff
- SVG
- SVG Preview
- vscode-lldb
- vscode-pdf
- YAML

##### Configuration highlights

_**Text Editor**_

- Theme: **Catppuccin Mocha**
- Icon Theme: **Material Icon Theme**
- Font: **JetBrainsMono Nerd Font**, Line Height **1.6**
- Bracket Pairs Horizontal: **true**
- Semantic Highlighting: **true**
- Word Wrap: **ON**, Cursor Blinking: **Smooth**, Smooth Caret Animation: **ON**
- Auto Save: **After Delay**

_**Python**_

- Ruff formats on save + fixes on save
- Pylance for autocomplete only (`typeCheckingMode: off`, no linting overlap)

_**C/C++**_

- `C_Cpp.intelliSenseEngine`: **disabled** (Clangd handles IntelliSense)
- Clangd args: `--background-index --clang-tidy --completion-style=detailed --header-insertion=never --inlay-hints=true`

_**Python-envs**_

- Terminal Auto Activation: **shellStartup**

_**Default interpreter**_

- `python.defaultInterpreterPath` points at the `uv` managed Python (e.g. `C:\Users\<you>\AppData\Roaming\uv\python\cpython-3.14.7-windows-x86_64-none\python.exe`)

#### Notepad++

Import the config files from [the Notepad++ folder][npp-folder] into `%APPDATA%\Notepad++\` (keep `config.xml`, `shortcuts.xml`, `stylers.xml`, `contextMenu.xml` and the `themes\` folder - I use the Catppuccin Mocha theme).

#### Rainmeter

Layout: **Boquet Suite II** + the `monstercat-visualizer` skin. Skins are loaded from `%APPDATA%\Rainmeter\`.

#### Brave

##### Flags (brave://flags)

- `enable-quic` - QUIC protocol
- `smooth-scrolling`
- `enable-parallel-downloading`
- `brave-ntp-refresh-enabled`
- `brave-ai-chat`

Some Brave flags are set via `brave://flags`; those are stored in `Local State` / `Preferences` and are not covered here.

##### Appearance & Settings

- Appearance
  - Theme: **Dark**
  - Vertical tabs: **ON** (collapsed, floating with hover)
  - Bookmark bar: **Show on all tabs**
- New Tab Page
  - Background: **Custom** radial gradient `#2D0264` -> `#030023`
  - Show stats only (no news feed, no search box)
- Search engine: **Brave Search**
- Shields: **Advanced** view, with 5 sites excluded

##### Extensions

- Bitwarden (password manager)
- Steam Artwork Hub Essentials (Steam profile artwork)

### Scheduled Tasks

Import all the tasks from the [`MyScripts`][tasks-folder] folder:

- ArchiSteamFarm
- ArchiSteamFarm exe
- Glance Dashboard
- MSIAfterburner
- OpenRGB
- Rainmeter (optional - disable in Task Scheduler if you are not using Rainmeter)
- Syncthing
- TodoBot-Startup
- Windhawk

[Vencord]: https://github.com/Vendicated/Vencord
[Millenium]: https://github.com/SteamClientHomebrew/Millennium
[Apollo]: https://github.com/ClassicOldSong/Apollo
[NVCleanstall]: https://www.techpowerup.com/nvcleanstall/
[VB-CABLE]: https://vb-audio.com/Cable/
[uv]: https://docs.astral.sh/uv/
[File.io]: https://www.file.io/
[autounattend.xml]: https://schneegans.de/windows/unattend-generator/?LanguageMode=Unattended&UILanguage=en-US&Locale=en-US&Keyboard=00000409&GeoLocation=244&ProcessorArchitecture=amd64&BypassNetworkCheck=true&KeepSensitiveFiles=true&ComputerNameMode=Script&ComputerNameScript=return+%27DESKTOP-%7B0%3AD3%7D%27+-f+%28+Get-Random+-Minimum+0+-Maximum+999+%29%3B&CompactOsMode=Never&TimeZoneMode=Implicit&PartitionMode=Interactive&DiskAssertionMode=Skip&WindowsEditionMode=Generic&WindowsEdition=pro&InstallFromMode=Automatic&PEMode=Default&UserAccountMode=InteractiveLocal&PasswordExpirationMode=Unlimited&LockoutMode=Disabled&HideFiles=None&ClassicContextMenu=true&LaunchToThisPC=true&ShowEndTask=true&TaskbarSearch=Label&TaskbarIconsMode=Default&DisableWidgets=true&LeftTaskbar=true&HideTaskViewButton=true&DisableBingResults=true&StartTilesMode=Empty&StartPinsMode=Empty&DisableFastStartup=true&AllowPowerShellScripts=true&DisableAppSuggestions=true&PreventDeviceEncryption=true&HideEdgeFre=true&DisableEdgeStartupBoost=true&DisablePointerPrecision=true&EffectsMode=Default&DeleteEdgeDesktopIcon=true&DesktopIconsMode=Default&StartFoldersMode=Custom&StartFolderFileExplorer=true&StartFolderSettings=true&WifiMode=Interactive&ExpressSettings=DisableAll&LockKeysMode=Skip&StickyKeysMode=Disabled&ColorMode=Default&WallpaperMode=Default&LockScreenMode=Default&Remove3DViewer=true&RemoveBingSearch=true&RemoveCalculator=true&RemoveCamera=true&RemoveClipchamp=true&RemoveClock=true&RemoveCopilot=true&RemoveCortana=true&RemoveDevHome=true&RemoveWindowsHello=true&RemoveFamily=true&RemoveFeedbackHub=true&RemoveGameAssist=true&RemoveGetHelp=true&RemoveHandwriting=true&RemoveInternetExplorer=true&RemoveMailCalendar=true&RemoveMaps=true&RemoveMathInputPanel=true&RemoveMediaFeatures=true&RemoveMixedReality=true&RemoveZuneVideo=true&RemoveNews=true&RemoveOffice365=true&RemoveOneDrive=true&RemoveOneNote=true&RemoveOneSync=true&RemoveOutlook=true&RemovePaint=true&RemovePaint3D=true&RemovePeople=true&RemovePowerAutomate=true&RemoveQuickAssist=true&RemoveRecall=true&RemoveRdpClient=true&RemoveSkype=true&RemoveSnippingTool=true&RemoveSolitaire=true&RemoveSpeech=true&RemoveStepsRecorder=true&RemoveStickyNotes=true&RemoveTeams=true&RemoveGetStarted=true&RemoveToDo=true&RemoveVoiceRecorder=true&RemoveWallet=true&RemoveWeather=true&RemoveFaxAndScan=true&RemoveWindowsMediaPlayer=true&RemoveZuneMusic=true&RemoveWordPad=true&RemoveXboxApps=true&RemoveYourPhone=true&WdacMode=Skip&AppLockerMode=Skip#:~:text=View%20.xml%20file-,Download%20.xml%20file,-Download%20.xml%20wrapped
[ip-and-ports]: https://github.com/Zephyr73/Windows-Setup/blob/main/ip-and-ports.md
[tasks-folder]: https://github.com/Zephyr73/Windows-Setup/tree/main/Task%20Scheduler/MyScripts
[wt-config]: https://github.com/Zephyr73/Windows-Setup/blob/main/Customization/Windows%20Terminal/settings.json
[nilesoft-folder]: https://github.com/Zephyr73/Windows-Setup/tree/main/Customization/Nilesoft%20Shell
[npp-folder]: https://github.com/Zephyr73/Windows-Setup/tree/main/Customization/Notepad%2B%2B
[ep-config]: https://github.com/Zephyr73/Windows-Setup/blob/main/Customization/Explorer%20Patcher/ExplorerPatcher.reg
[windhawk-folder]: https://github.com/Zephyr73/Windows-Setup/tree/main/Customization/Windhawk
[windhawk-mods]: https://github.com/Zephyr73/Windows-Setup/blob/main/Customization/Windhawk/MODS.md
[vscode-config]: https://github.com/Zephyr73/Windows-Setup/blob/main/Customization/VSCode/settings.json
[Brave-Debloat.reg]: https://github.com/Zephyr73/Windows-Setup/blob/main/Customization/Brave/Brave-Debloat.reg
[this Monitor Settings sheet]: https://docs.google.com/spreadsheets/d/13DLXK-cJcAJ8mueEGOYAwg0wl7UCZsZ0xiOf5OIk4EE/edit?gid=0#gid=0
[this ICC/ICM profiles Drive folder]: https://drive.google.com/drive/folders/1Y4YkZJee2GxCuM7ox-nrpiuB0YchEWxc
[this handbook]: https://github.com/Zephyr73/Windows-Setup/blob/main/system-environment.md
