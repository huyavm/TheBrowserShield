/**
 * Generate BrowserShield application icon (icon.ico)
 * Creates a multi-resolution Windows icon file with 16x16, 32x32, 48x48, and 256x256 sizes
 * 
 * The icon is a shield design representing browser protection
 */

const fs = require('fs');
const path = require('path');

// ICO file format constants
const ICO_HEADER_SIZE = 6;
const ICO_ENTRY_SIZE = 16;

/**
 * Create a shield icon bitmap at the specified size
 * Returns raw RGBA pixel data
 */
function createShieldBitmap(size) {
  const pixels = Buffer.alloc(size * size * 4);
  
  // Colors (RGBA)
  const shieldColor = { r: 59, g: 130, b: 246, a: 255 };      // Blue (#3B82F6)
  const shieldDark = { r: 37, g: 99, b: 235, a: 255 };        // Darker blue (#2563EB)
  const highlightColor = { r: 96, g: 165, b: 250, a: 255 };   // Light blue (#60A5FA)
  const transparent = { r: 0, g: 0, b: 0, a: 0 };
  
  const centerX = size / 2;
  const centerY = size / 2;
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      
      // Normalize coordinates to -1 to 1 range
      const nx = (x - centerX) / (size / 2);
      const ny = (y - centerY) / (size / 2);
      
      // Shield shape: wider at top, pointed at bottom
      const isInShield = isPointInShield(nx, ny);
      
      let color = transparent;
      
      if (isInShield) {
        // Add gradient effect - darker on right side
        if (nx > 0.1) {
          color = shieldDark;
        } else if (nx < -0.1) {
          color = highlightColor;
        } else {
          color = shieldColor;
        }
        
        // Add a "B" letter in the center for BrowserShield
        if (isPointInLetter(nx, ny, size)) {
          color = { r: 255, g: 255, b: 255, a: 255 }; // White
        }
      }
      
      pixels[idx] = color.b;     // Blue
      pixels[idx + 1] = color.g; // Green
      pixels[idx + 2] = color.r; // Red
      pixels[idx + 3] = color.a; // Alpha
    }
  }
  
  return pixels;
}

/**
 * Check if a normalized point is inside the shield shape
 */
function isPointInShield(nx, ny) {
  // Shield boundaries with padding
  const padding = 0.15;
  
  // Top of shield (rounded)
  const topY = -0.75 + padding;
  // Bottom point of shield
  const bottomY = 0.85 - padding;
  
  if (ny < topY || ny > bottomY) return false;
  
  // Shield width varies with height
  let maxWidth;
  
  if (ny < 0) {
    // Upper part - wider, slightly curved
    maxWidth = 0.7 - padding - Math.abs(ny) * 0.1;
  } else {
    // Lower part - tapers to point
    const progress = ny / bottomY;
    maxWidth = (0.7 - padding) * (1 - progress * progress);
  }
  
  return Math.abs(nx) < maxWidth;
}

/**
 * Check if point is inside the "B" letter
 */
function isPointInLetter(nx, ny, size) {
  // Scale letter based on icon size
  const letterScale = size < 32 ? 0.5 : 0.4;
  
  // Letter "B" boundaries
  const letterLeft = -0.25 * letterScale;
  const letterRight = 0.25 * letterScale;
  const letterTop = -0.35 * letterScale;
  const letterBottom = 0.35 * letterScale;
  
  // Thickness of letter strokes
  const strokeWidth = 0.12 * letterScale;
  
  // Check if in letter bounds
  if (nx < letterLeft || nx > letterRight || ny < letterTop || ny > letterBottom) {
    return false;
  }
  
  // Left vertical bar of B
  if (nx < letterLeft + strokeWidth) {
    return true;
  }
  
  // Top horizontal bar
  if (ny < letterTop + strokeWidth && nx < letterRight - strokeWidth * 0.5) {
    return true;
  }
  
  // Middle horizontal bar
  if (Math.abs(ny) < strokeWidth * 0.5 && nx < letterRight - strokeWidth * 0.5) {
    return true;
  }
  
  // Bottom horizontal bar
  if (ny > letterBottom - strokeWidth && nx < letterRight - strokeWidth * 0.5) {
    return true;
  }
  
  // Top bump of B (right side)
  const topBumpCenterY = (letterTop + 0) / 2;
  const topBumpRadius = (0 - letterTop) / 2 - strokeWidth * 0.3;
  const distToTopBump = Math.sqrt(Math.pow(nx - (letterRight - topBumpRadius), 2) + Math.pow(ny - topBumpCenterY, 2));
  if (distToTopBump < topBumpRadius && distToTopBump > topBumpRadius - strokeWidth) {
    return true;
  }
  
  // Bottom bump of B (right side)
  const bottomBumpCenterY = (0 + letterBottom) / 2;
  const bottomBumpRadius = (letterBottom - 0) / 2 - strokeWidth * 0.3;
  const distToBottomBump = Math.sqrt(Math.pow(nx - (letterRight - bottomBumpRadius), 2) + Math.pow(ny - bottomBumpCenterY, 2));
  if (distToBottomBump < bottomBumpRadius && distToBottomBump > bottomBumpRadius - strokeWidth) {
    return true;
  }
  
  return false;
}

/**
 * Convert RGBA bitmap to BMP format (for ICO)
 * ICO uses bottom-up DIB format
 */
function createBmpData(pixels, size) {
  const rowSize = size * 4;
  const bmpPixels = Buffer.alloc(size * size * 4);
  
  // Flip vertically (BMP is bottom-up)
  for (let y = 0; y < size; y++) {
    const srcRow = y * rowSize;
    const dstRow = (size - 1 - y) * rowSize;
    pixels.copy(bmpPixels, dstRow, srcRow, srcRow + rowSize);
  }
  
  // Create BITMAPINFOHEADER (40 bytes)
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);           // biSize
  header.writeInt32LE(size, 4);          // biWidth
  header.writeInt32LE(size * 2, 8);      // biHeight (doubled for AND mask)
  header.writeUInt16LE(1, 12);           // biPlanes
  header.writeUInt16LE(32, 14);          // biBitCount (32-bit RGBA)
  header.writeUInt32LE(0, 16);           // biCompression (BI_RGB)
  header.writeUInt32LE(bmpPixels.length, 20); // biSizeImage
  header.writeInt32LE(0, 24);            // biXPelsPerMeter
  header.writeInt32LE(0, 28);            // biYPelsPerMeter
  header.writeUInt32LE(0, 32);           // biClrUsed
  header.writeUInt32LE(0, 36);           // biClrImportant
  
  // AND mask (1-bit transparency mask, all zeros for 32-bit icons)
  const andMaskRowSize = Math.ceil(size / 32) * 4;
  const andMask = Buffer.alloc(andMaskRowSize * size);
  
  return Buffer.concat([header, bmpPixels, andMask]);
}

/**
 * Create ICO file with multiple resolutions
 */
function createIcoFile(sizes) {
  const images = sizes.map(size => {
    const pixels = createShieldBitmap(size);
    return {
      size,
      data: createBmpData(pixels, size)
    };
  });
  
  // ICO Header
  const header = Buffer.alloc(ICO_HEADER_SIZE);
  header.writeUInt16LE(0, 0);              // Reserved
  header.writeUInt16LE(1, 2);              // Type (1 = ICO)
  header.writeUInt16LE(images.length, 4);  // Number of images
  
  // Calculate offsets
  let dataOffset = ICO_HEADER_SIZE + (ICO_ENTRY_SIZE * images.length);
  
  // ICO Directory entries
  const entries = images.map(img => {
    const entry = Buffer.alloc(ICO_ENTRY_SIZE);
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 0);  // Width (0 = 256)
    entry.writeUInt8(img.size === 256 ? 0 : img.size, 1);  // Height (0 = 256)
    entry.writeUInt8(0, 2);                                 // Color palette
    entry.writeUInt8(0, 3);                                 // Reserved
    entry.writeUInt16LE(1, 4);                              // Color planes
    entry.writeUInt16LE(32, 6);                             // Bits per pixel
    entry.writeUInt32LE(img.data.length, 8);                // Size of image data
    entry.writeUInt32LE(dataOffset, 12);                    // Offset to image data
    
    dataOffset += img.data.length;
    return entry;
  });
  
  // Combine all parts
  return Buffer.concat([header, ...entries, ...images.map(img => img.data)]);
}

// Main execution
const sizes = [16, 32, 48, 256];
const icoData = createIcoFile(sizes);

const outputPath = path.join(__dirname, '..', 'public', 'icon.ico');
fs.writeFileSync(outputPath, icoData);

console.log(`Icon created successfully: ${outputPath}`);
console.log(`Sizes included: ${sizes.join('x, ')}x pixels`);
console.log(`File size: ${icoData.length} bytes`);
