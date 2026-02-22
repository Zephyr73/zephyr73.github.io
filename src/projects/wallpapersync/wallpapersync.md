---
layout: base.njk
title: WallpaperSync
description:
  WallpaperSync is a Python script that dynamically adjusts the color of connected RGB LED
  devices based on your desktop wallpaper using OpenRGB. The script continuously monitors the
  system wallpaper for changes and updates the LED colors to match the most prominent color in
  the wallpaper. This ensures a visually cohesive environment that aligns with your desktop's
  aesthetics.
date: 2023-10-27
tags: project
---

# WallpaperSync

![preview](/assets/img/WallpaperSync.jpg)

## How it works

[Demo](https://www.reddit.com/r/pcmasterrace/comments/1edjz55/made_this_script_that_changes_rgb_color_depending/)

## Real-time wallpaper monitoring

WallpaperSync uses [Watchdog](https://github.com/gorakhargosh/watchdog) to monitor the system wallpaper for changes from the path `%appdata%/Microsoft/Windows/Themes/TranscodedWallpaper`. The monitoring starts with the instantation of the `WallpaperHandler` class.

```python
path_to_wallpaper = os.path.join(local_folder, 'TranscodedWallpaper.png')
print("Monitoring wallpaper changes...")
event_handler = WallpaperHandler(original_path, path_to_wallpaper, ip, port)
```

The Observer starts listening for modifications to the specified wallpaper file. Upon detecting changes, it triggers the `on_modified` method defined in the `WallpaperHandler` class.

```python
observer = Observer()
observer.schedule(event_handler, path=os.path.dirname(original_path), recursive=False)
observer.start()
```

## Color Palette Extraction

After obtaining the new wallpaper, the script extracts the dominant colors using the `ColorThief` library. This functionality is encapsulated in the `process_wallpaper` function.

```python
def process_wallpaper(path_to_wallpaper: str) -> Tuple[List[Tuple[int, int, int]], Tuple[int, int, int]]:
    color_thief = ColorThief(path_to_wallpaper)
    palette = color_thief.get_palette(color_count=6)
```

The `ColorThief` class is instantiated witht he paath to the wallpaper, and the `get_palette` method extracts a palette of colors. The palette is then filtered to exclude nearly white colors using the `is_near_white` function.

## Color Adjustment

```python
def check_palette(palette: List[Tuple[int, int, int]], tolerance: float = 10.0, threshold: float = 50.0) -> str:

    ...
```

This function uses two inner functions, `is_greyscale()` and `is_low_contrast()`, to classify the palette based on defined thresholds.

Based on the classification, the script adjusts the selected colors. For instance, if the palette is classified as "greyscale", it sets a default color of white.

```python
if palette_type == 'greyscale':
    adjusted_rgb1 = (255, 255, 255)  # White
```

If it is classified as "low contrast", it identifies the most saturated color and enhances its vibrance

```python
most_saturated_color = max(filtered_palette, key=get_saturation)
adjusted_rgb1 = adjust_saturation_vibrance(most_saturated_color)
```

## Configuring LEDs

The script utilizes the OpenRGB client to connect to the LED devices and configure their colors based on the extracted palette.

```python
def configure_leds(adjusted_rgb1: Tuple[int, int, int], ip: str, port: int):
    client = OpenRGBClient(ip, port, 'Wal.py')
    client.connect()

    target_color = RGBColor(*adjusted_rgb1)
    fade_color_transition(client, target_color)
```

Here, the script creates a connection to the OpenRGB server using the specified IP address and port. It then calls the `fade_color_transition` function to smoothly transition the LED colors to match the wallpaper

## Fading color Transition

```python
def fade_color_transition(client: OpenRGBClient, target_color: RGBColor, duration: int = 1, steps: int = 20):
    current_colors = [device.colors[0] for device in client.devices]

...
```

The `fade_color_transition` function gradually changes the LED colors from the current state tot then new target color over a specified duration and number of steps.

The function calculates the intermediate color for each step and applies it to all connected LED devides, creating a smooth fading effect.

## Configuration Management

```python
def load_config(config_file: str) -> Tuple[str, int]:
    if os.path.isfile(config_file):
        with open(config_file, 'r') as file:
            config = json.load(file)
            return config.get('ip', 'localhost'), config.get('port', 6742)
    return 'localhost', 6742
```

The script supports loading and saving configurations through JSON files, allowing users to persist their IP and port settings for the OpenRGB client

This function checks if a configuration file exists and reads the server settings if it does. If not, it defaults to `localhost` and `6742`.
