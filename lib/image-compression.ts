/**
 * Image compression utility
 * Compresses images before upload to avoid 413 errors
 */

const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const QUALITY = 0.7; // 70% quality - good balance of size vs quality

/**
 * Compress an image file using canvas
 * @param file Original image file
 * @param maxWidth Maximum width (default 1920)
 * @param maxHeight Maximum height (default 1920)
 * @param quality JPEG quality 0-1 (default 0.7)
 * @returns Compressed file
 */
export async function compressImage(
	file: File,
	maxWidth = MAX_WIDTH,
	maxHeight = MAX_HEIGHT,
	quality = QUALITY,
): Promise<File> {
	return new Promise((resolve, reject) => {
		// Skip compression for small files (< 500KB)
		if (file.size < 500 * 1024) {
			resolve(file);
			return;
		}

		const img = new Image();
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");

		img.onload = () => {
			// Calculate new dimensions maintaining aspect ratio
			let { width, height } = img;

			if (width > maxWidth) {
				height = (height * maxWidth) / width;
				width = maxWidth;
			}
			if (height > maxHeight) {
				width = (width * maxHeight) / height;
				height = maxHeight;
			}

			// Set canvas size
			canvas.width = width;
			canvas.height = height;

			// Draw and compress
			if (ctx) {
				ctx.drawImage(img, 0, 0, width, height);
			}

			// Convert to blob
			canvas.toBlob(
				(blob) => {
					if (blob) {
						// Create new file with same name
						const compressedFile = new File([blob], file.name, {
							type: "image/jpeg",
							lastModified: Date.now(),
						});

						console.log(
							`[ImageCompression] ${file.name}: ${(file.size / 1024).toFixed(0)}KB -> ${(compressedFile.size / 1024).toFixed(0)}KB`,
						);

						resolve(compressedFile);
					} else {
						// Fallback to original if compression fails
						resolve(file);
					}
				},
				"image/jpeg",
				quality,
			);
		};

		img.onerror = () => {
			// Return original file if image loading fails
			reject(new Error("Failed to load image for compression"));
		};

		// Load image from file
		img.src = URL.createObjectURL(file);
	});
}

/**
 * Compress multiple images in parallel
 */
export async function compressImages(files: File[]): Promise<File[]> {
	return Promise.all(files.map((file) => compressImage(file)));
}
