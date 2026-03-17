---
layout: base.njk
title: How I setup my windows 11 desktop
description: This is a step by step process on how I configure my windows 11 desktop and some network configurations. This is in case I forget how I set them up
pageId: 3
tags: blogpost
date: 2023-10-27
---

# Step by step process of my windows setup

---

## Step 1

Before you start the guide, make sure to download a copy of Windows 11 ISO. I would suggest downloading the ISO of last year, usually they are more polished from my personal experience. So for example, as of today the latest version of Windows 11 is **25H2**, I would suggest downloading **24H2**. In some rare cases the newer version might be more polished and have less bugs on release, in that case download the latest one. Do your research to find the most stable version.

After downloading the ISO, download my [autounattend.xml][autounattend.xml]. You can import this file in https://schneegans.de/windows/unattend-generator/ and inspect it to add or remove settings. I would always suggest creating an autounattend file because it will install an almost clean windows without you having to manually uninstalling bloats and changing settings

Once you have both of these files, burn the ISO in a USB stick using **Rufus**. After the iso is installed in the USB stick, copy the `autounattend.xml` file and paste it in the root directory of the USB.

Restart your PC and boot into the USB to go through the windows setup. The process should be almost hands-free because of the unattend file.

## Step 2

### Initialization

- **Display**
  - Download GPU Display Drivers
    - For NVidia GPU users:
      - Download version 572.83 (most stable version for me)
      - Debloat via nvcleanstall
  - Set Display resolution and refresh rates
  - Set color depth in NVidia Control Panel or AMD Radeon Software

Even after installing windows with the unattend file, the default settings of windows are a privacy nightmare.

- **Settings**
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
        - **Disable** Spacial Sound
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
    - Uninstall bloats if there are any
  - Accounts
    - Make sure to use local account
  - Gaming
    - Game Bar
      - Allow controller to open Game bar: **OFF**
    - Captures
      - **Disable** captures
    - Game mode: **OFF**
  - Privacy & Security
    - **Disable** almost everything unless you need it

For some reasons, my PC used to drop connection at random times after I switched to gigabit internet. It usually happened when I am playing games or when I am in a voice call. Weird issue, never found the exact reason for it, however I fixed them by changing these settings after doing some research.

- **Device Manager**
  - `Ethernet > Properties > Advanced`
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

### Downloads

- **Browsers**
  - Brave Browser (Make sure to debloat it, instructions below)
  - Firefox (Make sure to debloat it)

- **Gaming**
  - Discord with [Vencord][Vencord]
  - Steam with [Millenium][Millenium]
  - [Apollo][Apollo]

- **Connectivity**
  - Tailscale
  - KDE Connect

- **Utilities**
  - 7zip
  - DisplayCal
  - VS Code
  - MSI Afterburner
  - Notepad++
  - OnlyOffice
  - OpenRGB
  - qBittorrent
  - Malwarebytes
  - VLC Player
  - Sysinternals Suite
  - TreeSize
  - Defender UI
  - Revo Uninstaller OR Bulk Crap Uninstaller (BCU)
  - nvcleanstall

- **Customization**
  - Nilesoft Shell
  - Transclucent Taskbar
  - Explorer Patcher
  - Windhawk
  - Rainmeter
  - Oh My Posh
  - Clink
  - Fonts
    - JetBrainsMono Nerd Font
    - Iosevka

> ### Network and Firewall
>
> Device IP Address should be managed by PiHole, however in the case it is not set appropriately:
>
> - Go to `control panel > network and internet > network and sharing center > ethernet > properties > ipv4`
> - set the device ip to `192.168.1.2xx`
>
>> **Note**
>> For a list of IP and Ports in case of a network rest, refer to the [handbook](ip-and-ports.md)

---

## Step 3

### Setting up Utilities

- Use **MSI Afterburner** to undervolt GPU and make sure to launch in startup
- Change **nvidia control panel** settings according to updated guide
- Turn off game optimization in **NVidia App**

 #### DisplayCal

The reason we will be using DisplayCal is because the default Windows Color Management program is not known to be reliable for handling color profiles. It glitches out especially when you switch to and from full screen mode, sometimes after a reboot it fails to load the color profile immediately. This is where DisplayCal comes in clutch, it makes sure the profile is always automatically loaded.

 After installing and setting up **DisplayCal**, download the calibrated `.icc` or `.icm` profiles for your monitor. YouTubers like *Techless* and *Monitor Unboxed* usually provide calibrated profiles for popular monitors. Once you download the color profiles, right click on them and select `Install Profile` from the context menu.

 Once you have everything ready, search for `Color Management` in windows search. On the top of the settings screen, it should show your monitors. Make sure to select the correct monitor. Once you select your monitor, click on the tickbox that says `Use my settings for this device`.

 On the bottom left of the settings screen, you should see an `Add...` button, click on it and you should see a lot of color profiles, from here select the one you installed earlier. Once you add the profile, it should already be set as default. However, just to be safe, click on the profile again and click `Set as Default Profile` just to be safe.

 After setting up the color profile in Windows Color Management, go to your system tray and right click the **DisplayCal** icon and click on `Profile Associations`. *The icon should be there if you installed **DisplayCal**, Do not launch **DisplayCal** App unless you are using hardware to calibrate your monitor*. **DisplayCal** should autoatically select the profile for you, but double check if it is the correct profile. On the bottom left, click on `Automatically fix profile associations`

> ### Shared Folders
>
> Share the Following drives to the network
>
> - `D:\Games`
> - `D:\Media`
> - `D:\Programming`
> - `D:\BACKUPS\Phone Backup\Samsung S25 ULTRA`
>
>
> ### PATH Variables
>
> Add the following directories to `User Variables > PATHS`
>
> - `D:\Programming\PATH Scripts`
> - `D:\Programming\PATH Scripts\ViVeTool v0.3.4`
> - `D:\Programming\Python\ThemeSwitcher\`
> - `%USERPROFILE%\Downloads\OpenRGB Windows 64-bit`
>
> ### Create Tasks
>
> Import the all the tasks from the tasks [folder][tasks-folder]

---

## Step 4

### Debloat

#### Chris Titus Tool

Copy and paste this in `PowerShell`

```sh
irm "https://christitus.com/win" | iex
```

From the **TWEAKS** tab

- Remove Widgets
- Set services to manual
- Adobe Network Block
- Brave Debloat
- Disable Microsoft Copilot
- Set Classic Right-Click Menu

Bing Search in Start Menu: **OFF**
Center Taskbar Items: **OFF**
Cross-Device Resume: **OFF**
Detailed BSoD: **OFF**
Disable Multiplane Overlay: **ON**
Modern Standby Fix: **ON**
Mouse Acceleration: **OFF**
Recommendations in Start Menu: **OFF**
Show File Extensions: **ON**
Show Hidden Files: **ON**

> For PC, you may want to `Add and Activate Ultimate Performance Profile`

From the **UPDATES** tab, select Security Settings. This should delay Feature updates by 1 year, and security updates by 1 week. Delaying feature updates

#### SysInternals: Autoruns

Go through all the tabs and make sure there are no hidden tasks or services running. Even though we set all services to manual from **Chris Titus Tool**, some services may be overlooked by it. You can double check the services, and tasks created by various apps.

Use this tool to help you with the next app, **Task Scheduler**

#### Task Scheduler

Many apps love to hide their automated scripts over here (Auto update, auto install etc). I personally turn off all auto update tasks created by Microsoft and other Browsers. Most of the services are generally safe to turn off, however it is best to do your own research.

---

## Step 5

### Customize Apps

#### Oh My Posh & Clink

Oh My Posh is needed to theme the terminal ui, Clink is used for suggestions and more advanced but helpful features.

Download **Oh My Posh** using the following command:

```sh
winget install JanDeDobbeleer.OhMyPosh --source winget
```

Download **Clink** using the following command:

```sh
winget install chrisant996.Clink
```

To locally download the themes for **Oh My Posh**, go to [the release page](https://github.com/JanDeDobbeleer/oh-my-posh/releases/), and download the `themes.zip` file.
Extract the themes.zip file in `~/Documents/OhMyPosh themes/`


To change your theme for **PowerShell**, open **PowerShell** and type

```sh
notepad $PROFILE
```

This will create a Profile for PowerShell in one of these locations

- `$HOME\Documents\Powershell\Microsoft.PowerShell_profile.ps1` (For PowerShell 7)
- `$HOME\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1` (For PowerShell 5.1)

Download your favorite theme for **Oh My Posh** and save it in `Documents`, and to apply it, enter the following in the **PowerShell** profile

```sh
oh-my-posh init pwsh --config '$HOME/Documents/OhMyPosh themes/catppuccin_mocha.omp.json' | Invoke-Expression
```

Once altered, reload your profile for the changes to take effect

```sh
. $PROFILE
```

For **CMD/Command Prompt** enter the following in your terminal:

```sh
clink config prompt use oh-my-posh
```

```sh
clink set ohmyposh.theme "%USERPROFILE%\Documents\OhMyPosh themes\catppuccin_mocha.omp.json"
```

restart your CMD to see difference

#### Windows Terminal

You can either import the config from [here][terminal-config], or have a fresh start.
Here are some settings which I recommend to change:

- Launch Size: 120 x 30
- Center on launch
- Appearance
  - JetBrainsMono Nerd Font Mono
  - Font Size: 11
  - Line height: 1.2
  - Cell width: 0.6
  - Background Opacity: 80%
  - Window Padding: 30
- Profiles
  - PowerShell
    - Command line: powershell.exe -nologo

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

#### Nilesoft Shell

Just copy paste the config files

#### Transclucent Taskbar

Everything should be at default settings except
`Desktop > Acrylic`
`Maximized window > Acrylic`

#### Explorer Patcher

Import the config file, OR apply these main settings:

##### Taskbar

- Taskbar Style: **Windows 11**
- Search: **Hidden**
- Show Task View Button: \*_OFF_

##### File Explorer

- Disable the windows 11 context menu: **OFF**
- Use classic drive groupings in this PC: **OFF**
  - Control Interface: **Windows 10 Ribbon**

##### Other

- Disable Rounded Corners

#### Windhawk

Download the following extenstions for windhawk

- Slick window arrangement
- Windows 11 notification center styler
- Windows 11 start menu slider

Go to `Settings > Advanced Settings > More Advanced Settings`
In the `Process inclusion list` enter `dwm.exe`
Save and Restart Windhawk

##### Slick window arrangement

- Slick windows distance: 25

##### Windows 11 notification center styler

- Theme: Matter

##### Windows 11 start menu styler

- Theme: **Windows11_Metro10Minimal**
- Disable the new start menu layout: **ON**
- Control styles
  - Target: `Border#AcrylicBorder`
    Styles: `Background:=<AcrylicBrush TintOpacity="0" TintColor="Black" TintLuminosityOpacity="0.6" Opacity="1" FallbackColor="#101010"/>`
  - Target: `Border#AppBorder`
    Styles: `Background:=<AcrylicBrush TintOpacity="0" TintColor="Black" TintLuminosityOpacity="0.6" Opacity="1" FallbackColor="#101010"/>`

#### VS Code

##### Download the following extensions before setting the configs

 - Python Preview (Discontinued, Download from shared folder)

- AREPL for Python
- C/C++
- C/C++ Extension Pack
- Catppuccin for VSCode
- clangd
- CMake Tools
- Code Runner
- Debug Visualizer
- Doxygen Documentation Gemerator
- Gemini Code Assist
- Github Copilot Chat
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
- Open in Github, Bitbucket, Gitlab
- Project Tree
- Pylance
- Python
- Python debugger
- Python Environments
- Remote - SSH
- Remote - SSH: Editing Configuration Files
- Ruff
- vscode-pdf
- YAML

##### Configuration for VS Code

**_Text Editor_**

- Bracket Pairs Horizontal: true
- Line Height: 1.6
- Semantic Highlighting Enabled: true
- Smooth Scrolling: ON
- Word Wrap: ON
- Cursor Blinking: Smooth
- Cursor Smooth Caret Animation: on
- Font Family: JetBrains Mono Nerd Font
- Font Size: 14
- Auto Save: After Delay

**_Workbench_**

- Smooth Scrolling: ON
- Workbench Color theme: Catppuccin Mocha
- Icon Theme: Material Icon Theme
- Empty Hint: hidden

**_Features_**

- Explorer Kind: Integrated
- Integrated > Font Ligatures Enabled: ON
- Integrated Mouse wheel zoom: ON
- Integrated Smooth Scrolling: ON

**_C/C++_**

- C_Cpp Intelli Sense Engine: Disabled

**_Clangd_**

- Clangd Arguments:
  - `--inlay-hints=true`
- Clangd PATH: `ENTER PATH OF CLANGD.exe`

**_Git_**

- Open Repository in Parent Folders: Never

**_Live Server_**

- Donot verify tags: ON

**_Python_**

- **Python > Analysis > Inlay hints: Call Argument Names:** ON
- **Python > Analysis > Inlay hints: Variable Types:** ON
- **Python > Analysis: Type Checking Mode:** OFF
- Language Server: Pylance
- **Python-envs > Terminal: Auto Activation Type:** shellStartup

[Vencord]: https://github.com/Vendicated/Vencord
[Millenium]: https://github.com/SteamClientHomebrew/Millennium
[Apollo]: https://github.com/ClassicOldSong/Apollo
[tasks-folder]: ./Task%20Scheduler/MyScripts/
[terminal-config]: ./Customization/Windows%20Terminal/
[autounattend.xml]: #