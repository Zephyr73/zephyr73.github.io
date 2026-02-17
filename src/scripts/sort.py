"""
Gallery image sort and HTML generator.

Usage (run from repo root):
  1. Add images to assets/img/gallery/photography, assets/img/gallery/ai, or assets/img/gallery/forza.
  2. Run:  python src/scripts/sort.py

This script:
  - Sorts images (EXIF date for photography, modification date for ai/forza).
  - Renames them to 1.jpg, 2.jpg, ... in place.
  - Regenerates the three column blocks inside gallery/index.html for each section.
"""
import os
import re
from PIL import Image
from datetime import datetime


def get_image_exif_date(image_path):
    try:
        image = Image.open(image_path)
        exif_data = image._getexif()
        if exif_data is not None:
            date_str = exif_data.get(36867)  # DateTimeOriginal
            if date_str:
                return datetime.strptime(date_str, '%Y:%m:%d %H:%M:%S')
    except Exception as e:
        print(f"Error reading EXIF data from {image_path}: {e}")
    return None


def sort_images_by_date(folder_path):
    images_with_dates = []
    for filename in os.listdir(folder_path):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):
            image_path = os.path.join(folder_path, filename)
            date = get_image_exif_date(image_path)
            if date:
                images_with_dates.append((image_path, date))
    images_with_dates.sort(key=lambda x: x[1], reverse=True)
    return [image[0] for image in images_with_dates]


def sort_images_by_modification_date(folder_path):
    images_with_dates = []
    for filename in os.listdir(folder_path):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):
            image_path = os.path.join(folder_path, filename)
            modification_time = os.path.getmtime(image_path)
            images_with_dates.append((image_path, datetime.fromtimestamp(modification_time)))
    images_with_dates.sort(key=lambda x: x[1], reverse=True)
    return [image[0] for image in images_with_dates]


def rename_images(images):
    new_image_names = []
    for index, image_path in enumerate(images):
        temp_new_name = f"temp_{index + 1}.jpg"
        temp_new_path = os.path.join(os.path.dirname(image_path), temp_new_name)
        try:
            os.rename(image_path, temp_new_path)
            print(f"Temporarily renamed {image_path} to {temp_new_path}")
            new_image_names.append(temp_new_path)  # Keep track of the new names
        except FileNotFoundError:
            print(f"File not found: {image_path}. It may not exist.")
            continue

    for index in range(len(images)):
        temp_new_name = f"temp_{index + 1}.jpg"
        final_new_name = f"{index + 1}.jpg"
        temp_new_path = os.path.join(os.path.dirname(images[index]), temp_new_name)
        final_new_path = os.path.join(os.path.dirname(images[index]), final_new_name)
        try:
            os.rename(temp_new_path, final_new_path)
            print(f"Renamed {temp_new_path} to {final_new_path}")
            new_image_names[index] = final_new_path  # Update to final new name
        except FileNotFoundError:
            print(f"File not found: {temp_new_path}. It may not exist.")
            continue
            
    return new_image_names  # Return the list of new names


# Base URL for gallery images (must match site asset path)
IMG_BASE = "/assets/img/gallery"


def _img_src(img_path, subfolder):
    """Return img src and alt for gallery image."""
    basename = os.path.basename(img_path)
    name = basename[:-4] if len(basename) > 4 else basename
    return f'        <img src="{IMG_BASE}/{subfolder}/{basename}" alt="image {name}" decoding="async" loading="lazy">'


def generate_new_columns_html(images, is_ai=False, is_forza=False):
    total_images = len(images)
    columns = 3
    base_images_per_column = total_images // columns
    extra_images = total_images % columns
    new_html = []
    subfolder = "ai" if is_ai else ("forza" if is_forza else "photography")

    start_index = 0
    for col in range(columns):
        if col == 0:
            new_html.append('      <div class="gallery-grid__column">')
        else:
            new_html.append('      <div class="gallery-grid__column">')

        if col < extra_images:
            images_in_this_column = base_images_per_column + 1
        else:
            images_in_this_column = base_images_per_column

        images_to_display = images[start_index:start_index + images_in_this_column]
        start_index += images_in_this_column

        for img_path in images_to_display:
            new_html.append(_img_src(img_path, subfolder))

        new_html.append('      </div>')

    return '\n'.join(new_html)


def generate_horizontal_columns_html(images, is_ai=False, is_forza=False):
    columns = 3
    subfolder = "ai" if is_ai else ("forza" if is_forza else "photography")
    new_html = [[] for _ in range(columns)]

    for index, img_path in enumerate(images):
        column_index = index % columns
        new_html[column_index].append(_img_src(img_path, subfolder))

    final_html = []
    for col_index in range(columns):
        final_html.append('      <div class="gallery-grid__column">')
        final_html.extend(new_html[col_index])
        final_html.append('      </div>')

    return '\n'.join(final_html)


# Map internal category name to the BEM class used in gallery HTML
_GALLERY_GRID_CLASS = {
    "photography-container": "gallery-grid gallery-grid--photography",
    "ai-container": "gallery-grid gallery-grid--ai",
    "forza-container": "gallery-grid gallery-grid--forza",
}


def replace_gallery_columns(html_path, new_columns_html, container_class):
    """
    Replace the three column divs inside a gallery grid container.
    Matches structure: <div class="gallery-grid gallery-grid--{section} [is-visible]"> ... columns ... </div>
    """
    try:
        with open(html_path, 'r', encoding='utf-8') as file:
            content = file.read()

        grid_class = _GALLERY_GRID_CLASS.get(container_class)
        if not grid_class:
            print(f"Unknown container_class: {container_class}")
            return

        # Photography container may have is-visible; ai/forza do not
        if container_class == "photography-container":
            opening = rf'<div class="{re.escape(grid_class)}(?:\s+is-visible)?">\s*'
        else:
            opening = rf'<div class="{re.escape(grid_class)}">\s*'

        # Match three gallery-grid__column divs (any content inside each)
        pattern = (
            r'(' + opening + r')'
            r'(<div class="gallery-grid__column">.*?</div>\s*'
            r'<div class="gallery-grid__column">.*?</div>\s*'
            r'<div class="gallery-grid__column">.*?</div>)'
            r'(\s*</div>)'
        )
        updated_content = re.sub(
            pattern,
            r'\1' + new_columns_html + r'\n    \3',
            content,
            count=1,
            flags=re.DOTALL
        )

        if updated_content == content:
            print(f"Warning: no match found in {html_path} for {container_class}. Check that the file uses class=\"gallery-grid gallery-grid--...\" and gallery-grid__column.")
        else:
            print(f"Updated {html_path} – {container_class}.")

        with open(html_path, 'w', encoding='utf-8') as file:
            file.write(updated_content)
    except Exception as e:
        print(f"Error updating HTML file: {e}")


def main(folder_photography, folder_ai, folder_forza, html_path, layout="default"):
    # Define the categories to process
    categories = [
        (folder_photography, "photography-container", True, False),
        (folder_ai, "ai-container", False, True),
        (folder_forza, "forza-container", False, False)
    ]

    for folder, container, by_exif, is_ai in categories:
        # Sort images based on EXIF data or modification date
        images = sort_images_by_date(folder) if by_exif else sort_images_by_modification_date(folder)
        new_images = rename_images(images)  # Rename images

        # Generate new HTML based on layout
        if layout == "horizontal":
            new_columns_html = generate_horizontal_columns_html(new_images, is_ai=is_ai, is_forza=not is_ai and container == "forza-container")
        else:
            new_columns_html = generate_new_columns_html(new_images, is_ai=is_ai, is_forza=not is_ai and container == "forza-container")

        replace_gallery_columns(html_path, new_columns_html, container)


if __name__ == "__main__":
    # Run from repo root. Image folders live under assets/img/gallery/.
    folder_photography = r'assets/img/gallery/photography'
    folder_ai = r'assets/img/gallery/ai'
    folder_forza = r'assets/img/gallery/forza'
    html_path = r'gallery/index.html'

    # "default" = fill columns in order; "horizontal" = distribute images round-robin across columns
    layout = "default"

    main(folder_photography, folder_ai, folder_forza, html_path, layout)
