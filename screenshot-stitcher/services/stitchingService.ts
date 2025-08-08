
const findOverlap = (img1: HTMLImageElement, img2: HTMLImageElement, cropHeight: number): number => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 0;

    const width = Math.min(img1.width, img2.width);
    if (width === 0) return 0;

    // Get pixel data for the top part of the (potentially cropped) img2
    const img2EffectiveHeight = img2.height - cropHeight;
    if (img2EffectiveHeight <= 0) return 0;
    
    canvas.width = width;
    canvas.height = img2EffectiveHeight;
    ctx.drawImage(img2, 0, cropHeight, width, img2EffectiveHeight, 0, 0, width, img2EffectiveHeight);
    const data2 = ctx.getImageData(0, 0, width, img2EffectiveHeight).data;

    // Get pixel data for img1 (never cropped)
    canvas.height = img1.height;
    ctx.drawImage(img1, 0, 0, width, img1.height);
    const data1 = ctx.getImageData(0, 0, width, img1.height).data;

    const rowBytes = width * 4;
    const MIN_CONFIRM_ROWS = 15; // Number of consecutive rows that must match to confirm an overlap

    // Don't search for matches if either image is too small
    if (img1.height < MIN_CONFIRM_ROWS || img2EffectiveHeight < MIN_CONFIRM_ROWS) {
        return 0;
    }
    
    // Start searching from the middle of the first image
    const searchAreaStartRow = Math.floor(img1.height / 2);

    for (let y1 = searchAreaStartRow; y1 < img1.height - MIN_CONFIRM_ROWS; y1++) {
        let isMatch = true;
        // Check if a block of MIN_CONFIRM_ROWS matches
        for (let r = 0; r < MIN_CONFIRM_ROWS; r++) {
            const y1_offset = (y1 + r) * rowBytes;
            const y2_offset = r * rowBytes;

            let pixelDifferences = 0;
            // Compare the row of pixels
            for (let i = 0; i < rowBytes; i += 4) { // Check each pixel (4 bytes)
                if (data1[y1_offset + i] !== data2[y2_offset + i] ||
                    data1[y1_offset + i + 1] !== data2[y2_offset + i + 1] ||
                    data1[y1_offset + i + 2] !== data2[y2_offset + i + 2]) {
                    pixelDifferences++;
                }
            }

            // If more than 1% of pixels are different, it's not a match
            if (pixelDifferences > width * 0.01) {
                isMatch = false;
                break;
            }
        }

        if (isMatch) {
            // Found a verified match!
            const overlap = img1.height - y1;
            return overlap;
        }
    }

    return 0; // No overlap found
};


export const stitchImages = (files: File[], options?: { separatorHeight: number, separatorColor: string, commonHeaderHeight?: number }): Promise<string> => {
  return new Promise((resolve, reject) => {
    const imagePromises: Promise<HTMLImageElement>[] = files.map(file => {
      return new Promise((resolveImage, rejectImage) => {
        const img = new Image();
        img.onload = () => resolveImage(img);
        img.onerror = () => rejectImage(new Error(`Failed to load image: ${file.name}`));
        img.src = URL.createObjectURL(file);
      });
    });

    Promise.all(imagePromises)
      .then(images => {
        images.forEach(img => URL.revokeObjectURL(img.src));

        if (images.length === 0) {
          return resolve('');
        }
        
        const separatorHeight = options?.separatorHeight ?? 0;
        const separatorColor = options?.separatorColor ?? '#000000';
        const cropHeight = options?.commonHeaderHeight ?? 0;

        // Step 1: Calculate overlaps between consecutive images
        const overlaps = [0]; // First image has no overlap
        for (let i = 1; i < images.length; i++) {
            const overlap = findOverlap(images[i - 1], images[i], cropHeight);
            overlaps.push(overlap);
        }

        // Step 2: Calculate final canvas dimensions
        const maxWidth = Math.max(...images.map(img => img.width));
        let totalHeight = images[0].height;
        for (let i = 1; i < images.length; i++) {
            let imgHeight = images[i].height;
            if (cropHeight > 0 && imgHeight > cropHeight) {
                imgHeight -= cropHeight;
            }
            totalHeight += imgHeight - overlaps[i];

            // Add separator height if there was no overlap
            if (overlaps[i] === 0 && separatorHeight > 0) {
                totalHeight += separatorHeight;
            }
        }

        const canvas = document.createElement('canvas');
        canvas.width = maxWidth;
        canvas.height = totalHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Could not get canvas context'));
        }
        
        // Step 3: Draw images with calculated offsets
        let currentY = 0;
        images.forEach((img, index) => {
            const overlap = overlaps[index];
            const xPos = (maxWidth - img.width) / 2;
            let yPos = currentY - overlap;

            let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;

            if (index > 0 && cropHeight > 0 && img.height > cropHeight) {
                sy = cropHeight;
                sHeight -= cropHeight;
            }
            
            ctx.drawImage(img, sx, sy, sWidth, sHeight, xPos, yPos, sWidth, sHeight);
            currentY = yPos + sHeight;

            // Add separator if specified and no overlap was found
            if (index < images.length - 1 && overlaps[index + 1] === 0 && separatorHeight > 0) {
                ctx.fillStyle = separatorColor;
                ctx.fillRect(0, currentY, maxWidth, separatorHeight);
                currentY += separatorHeight;
            }
        });

        resolve(canvas.toDataURL('image/png'));
      })
      .catch(error => {
        reject(error);
      });
  });
};
