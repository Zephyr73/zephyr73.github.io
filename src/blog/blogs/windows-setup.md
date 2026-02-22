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

### Initialization

- **Display**
  - Download NVidia Drivers (Preferrably Debloated)
  - Set Display resolution and refresh rates
  - Set color depth in NVidia Control Panel

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
  - Brave Browser (Make sure to debloat it)
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

### Network and Firewall

Device IP Address should be managed by PiHole, however in the case it is not set appropriately:

- Go to `control panel > network and internet > network and sharing center > ethernet > properties > ipv4`
- set the device ip to `192.168.1.200`

> **Note**
> For a list of IP and Ports in case of a network rest, refer to the [handbook](ip-and-ports.md)

---

## Step 2

### Shared Folders

Share the Following drives to the network

- `D:\Games`
- `D:\Media`
- `D:\Programming`
- `D:\BACKUPS\Phone Backup\Samsung S25 ULTRA`

### Performance

- Use **MSI Afterburner** to undervolt GPU and make sure to launch in startup
- Change **nvidia control panel** settings according to updated guide
- Turn off game optimization in NVidia App
- Go to task scheduler and disable all unwanted tasks
- Go to **Sysinternals Suite: Autoruns**, go through it to make sure there are no sneaky startup tasks

### PATH Variables

Add the following directories to `User Variables > PATHS`

- `D:\Programming\PATH Scripts`
- `D:\Programming\PATH Scripts\ViVeTool v0.3.4`
- `D:\Programming\Python\ThemeSwitcher\`
- `C:\Users\Zephyr\Downloads\OpenRGB Windows 64-bit`

### Create Tasks

Import the all the tasks from the tasks [folder][tasks-folder]

---

## Step 3

### Customize Apps

#### Oh My Posh & Clink

Oh My Posh is needed to theme the terminal ui, Clink is used for suggestions and more advanced but helpful features.

Download Oh My Posh using the following command in powershell:

```sh
winget install JanDeDobbeleer.OhMyPosh --source winget
```

To check if it is intalled properly type `oh-my-posh` in powershell or cmd
Once installed, type the following command to use a default config

```sh
oh-my-posh --config 'https://raw.githubusercontent.com/JanDeDobbeleer/oh-my-posh/main/themes/jandedobbeleer.omp.json'
```

To change your theme for **PowerShell**, adjust the init script in `C:\Users\Zephyr\Documents\Powershell\Microsoft.PowerShell_profile.ps1` or `C:\Users\Zephyr\Documents\WindowsPowerShell\Microsoft.PowerShell_profile.ps1`
If neither location exist, open Powershell and then type `$PROFILE` to find the location for the profile script. Or ask an AI on how to find/create one.

If the file `Microsoft.PowerShell_profile.ps1` does not exist, create it and paste the following for applying catppuccin theme

```sh
oh-my-posh init pwsh --config 'C:\Users\Zephyr\AppData\Local\Programs\oh-my-posh\themes\catppuccin_mocha.omp.json' | Invoke-Expression
```

Once altered, reload your profile for the changes to take effect

```sh
. $PROFILE
```

For **CMD/Command Prompt** search for `oh-my-posh.lua`, which should be in `C:\Program Files(x86)\clink\` after you install clink. Open the file and then paste the following

```sh
load(io.popen('oh-my-posh init cmd --config https://raw.githubusercontent.com/JanDeDobbeleer/oh-my-posh/main/themes/catppuccin_mocha.omp.json'):read("*a"))()
```

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

#### Windhawk

Download the following extenstions for windhawk

- Disable rounder corners in windows 11
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
