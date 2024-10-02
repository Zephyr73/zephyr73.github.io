# python script that helps me sort my photos in the gallery

import os
import re
from PIL import Image
from datetime import datetime

def get_image_exif_date(image_path):
    try:
        image = Image.open(image_path)
        exif_data = image._getexif()
        if exif_data is not None:
            # EXIF tag 36867 is the DateTimeOriginal
            date_str = exif_data.get(36867)
            if date_str:
                # Convert the EXIF date string to a datetime object
                return datetime.strptime(date_str, '%Y:%m:%d %H:%M:%S')
    except Exception as e:
        print(f"Error reading EXIF data from {image_path}: {e}")
    return None

def sort_images_by_date(folder_path):
    images_with_dates = []

    # Traverse the directory and get images with their EXIF date
    for filename in os.listdir(folder_path):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):
            image_path = os.path.join(folder_path, filename)
            date = get_image_exif_date(image_path)
            if date:
                images_with_dates.append((image_path, date))

    # Sort the images by date in descending order
    images_with_dates.sort(key=lambda x: x[1], reverse=True)

    return [image[0] for image in images_with_dates]

def rename_images(images):
    for index, image_path in enumerate(images):
        # Create a temporary name to avoid collisions
        temp_new_name = f"temp_{index + 1}.jpg"
        temp_new_path = os.path.join(os.path.dirname(image_path), temp_new_name)
        
        # Rename the file to the temporary name
        try:
            os.rename(image_path, temp_new_path)
            print(f"Temporarily renamed {image_path} to {temp_new_path}")
        except FileNotFoundError:
            print(f"File not found: {image_path}. It may not exist.")
            continue

    # Now rename them to the final names
    for index in range(len(images)):
        temp_new_name = f"temp_{index + 1}.jpg"
        final_new_name = f"{index + 1}.jpg"
        
        temp_new_path = os.path.join(os.path.dirname(images[index]), temp_new_name)
        final_new_path = os.path.join(os.path.dirname(images[index]), final_new_name)
        
        try:
            os.rename(temp_new_path, final_new_path)
            print(f"Renamed {temp_new_path} to {final_new_path}")
        except FileNotFoundError:
            print(f"File not found: {temp_new_path}. It may not exist.")
            continue

def generate_new_columns_html(images):
    total_images = len(images)
    
    # Define the number of columns
    columns = 3
    # Calculate the number of images in each column
    base_images_per_column = total_images // columns
    extra_images = total_images % columns

    # Prepare new HTML content for the image columns
    new_html = []
    
    start_index = 0
    for col in range(columns):
        new_html.append('<div class="column">')

        # Calculate the number of images for the current column
        if col < extra_images:
            images_in_this_column = base_images_per_column + 1
        else:
            images_in_this_column = base_images_per_column

        # Get the images for the current column
        images_to_display = images[start_index:start_index + images_in_this_column]
        start_index += images_in_this_column

        for img_path in images_to_display:
            new_html.append(f'    <img src="/img/gallery/photography/{os.path.basename(img_path)}">')
        
        new_html.append('</div>')
    
    return '\n'.join(new_html)

def replace_gallery_columns(html_path, new_columns_html):
    try:
        with open(html_path, 'r', encoding='utf-8') as file:
            content = file.read()

        # Use regex to match and replace the entire photography-container content non-greedily
        updated_content = re.sub(
            r'(<div class="photography-container">)(.*?)(</div>\s*</div>)',
            rf'\1\n{new_columns_html}\n\3',
            content,
            flags=re.DOTALL
        )

        with open(html_path, 'w', encoding='utf-8') as file:
            file.write(updated_content)

        print(f"Updated HTML file at {html_path} with new images.")
    except Exception as e:
        print(f"Error updating HTML file: {e}")

def main(folder_path, html_path):
    images = sort_images_by_date(folder_path)
    rename_images(images)
    
    new_columns_html = generate_new_columns_html(images)
    replace_gallery_columns(html_path, new_columns_html)

if __name__ == "__main__":
    folder_path = r'img\gallery\photography'  # Change this to your image folder path
    html_path = r'gallery\index_test.html'  # Change this to your HTML file path
    main(folder_path, html_path)
