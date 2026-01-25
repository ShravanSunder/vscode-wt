#!/usr/bin/env node

/**
 * Generate a simple 128x128 PNG icon for the extension
 * Uses pure Node.js - creates a minimal valid PNG with a colored square
 */

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

// Icon color: #4a6b8a (the extension's theme color)
const R = 0x4a;
const G = 0x6b;
const B = 0x8a;

const SIZE = 128;

function createPNG(width, height, r, g, b) {
	// PNG signature
	const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

	// IHDR chunk
	const ihdrData = Buffer.alloc(13);
	ihdrData.writeUInt32BE(width, 0);
	ihdrData.writeUInt32BE(height, 4);
	ihdrData.writeUInt8(8, 8); // bit depth
	ihdrData.writeUInt8(2, 9); // color type (RGB)
	ihdrData.writeUInt8(0, 10); // compression
	ihdrData.writeUInt8(0, 11); // filter
	ihdrData.writeUInt8(0, 12); // interlace
	const ihdr = createChunk('IHDR', ihdrData);

	// IDAT chunk (image data)
	// Create raw image data: filter byte + RGB pixels per row
	const rawData = Buffer.alloc(height * (1 + width * 3));
	for (let y = 0; y < height; y++) {
		const rowOffset = y * (1 + width * 3);
		rawData[rowOffset] = 0; // filter type: none
		for (let x = 0; x < width; x++) {
			const pixelOffset = rowOffset + 1 + x * 3;
			// Add a subtle gradient/border effect
			const distFromEdge = Math.min(x, y, width - 1 - x, height - 1 - y);
			const isBorder = distFromEdge < 8;
			const isInnerBorder = distFromEdge >= 8 && distFromEdge < 16;

			if (isBorder) {
				// Darker border
				rawData[pixelOffset] = Math.floor(r * 0.6);
				rawData[pixelOffset + 1] = Math.floor(g * 0.6);
				rawData[pixelOffset + 2] = Math.floor(b * 0.6);
			} else if (isInnerBorder) {
				// Slightly lighter inner area
				rawData[pixelOffset] = Math.min(255, Math.floor(r * 1.1));
				rawData[pixelOffset + 1] = Math.min(255, Math.floor(g * 1.1));
				rawData[pixelOffset + 2] = Math.min(255, Math.floor(b * 1.1));
			} else {
				// Main color
				rawData[pixelOffset] = r;
				rawData[pixelOffset + 1] = g;
				rawData[pixelOffset + 2] = b;
			}
		}
	}

	// Draw "WT" text in center (simple pixel font)
	drawText(rawData, width, height);

	const compressed = zlib.deflateSync(rawData);
	const idat = createChunk('IDAT', compressed);

	// IEND chunk
	const iend = createChunk('IEND', Buffer.alloc(0));

	return Buffer.concat([signature, ihdr, idat, iend]);
}

function drawText(rawData, width, height) {
	// Simple 5x7 pixel font for "WT"
	const W = [
		[1, 0, 0, 0, 1],
		[1, 0, 0, 0, 1],
		[1, 0, 1, 0, 1],
		[1, 0, 1, 0, 1],
		[1, 1, 0, 1, 1],
		[1, 1, 0, 1, 1],
		[1, 0, 0, 0, 1],
	];

	const T = [
		[1, 1, 1, 1, 1],
		[0, 0, 1, 0, 0],
		[0, 0, 1, 0, 0],
		[0, 0, 1, 0, 0],
		[0, 0, 1, 0, 0],
		[0, 0, 1, 0, 0],
		[0, 0, 1, 0, 0],
	];

	const scale = 6;
	const letterWidth = 5 * scale;
	const letterHeight = 7 * scale;
	const gap = 2 * scale;
	const totalWidth = letterWidth * 2 + gap;
	const startX = Math.floor((width - totalWidth) / 2);
	const startY = Math.floor((height - letterHeight) / 2);

	// Light color for text
	const textR = 0xe0;
	const textG = 0xe0;
	const textB = 0xe0;

	function drawLetter(letter, offsetX) {
		for (let ly = 0; ly < 7; ly++) {
			for (let lx = 0; lx < 5; lx++) {
				if (letter[ly][lx]) {
					// Draw scaled pixel
					for (let sy = 0; sy < scale; sy++) {
						for (let sx = 0; sx < scale; sx++) {
							const px = startX + offsetX + lx * scale + sx;
							const py = startY + ly * scale + sy;
							if (px >= 0 && px < width && py >= 0 && py < height) {
								const rowOffset = py * (1 + width * 3);
								const pixelOffset = rowOffset + 1 + px * 3;
								rawData[pixelOffset] = textR;
								rawData[pixelOffset + 1] = textG;
								rawData[pixelOffset + 2] = textB;
							}
						}
					}
				}
			}
		}
	}

	drawLetter(W, 0);
	drawLetter(T, letterWidth + gap);
}

function createChunk(type, data) {
	const length = Buffer.alloc(4);
	length.writeUInt32BE(data.length);

	const typeBuffer = Buffer.from(type, 'ascii');
	const crcData = Buffer.concat([typeBuffer, data]);
	const crc = crc32(crcData);

	const crcBuffer = Buffer.alloc(4);
	crcBuffer.writeUInt32BE(crc >>> 0);

	return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buffer) {
	let crc = 0xffffffff;
	const table = getCRC32Table();

	for (let i = 0; i < buffer.length; i++) {
		crc = table[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
	}

	return crc ^ 0xffffffff;
}

let crc32Table = null;
function getCRC32Table() {
	if (crc32Table) return crc32Table;

	crc32Table = new Uint32Array(256);
	for (let i = 0; i < 256; i++) {
		let c = i;
		for (let j = 0; j < 8; j++) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}
		crc32Table[i] = c;
	}
	return crc32Table;
}

// Generate and save icon
const png = createPNG(SIZE, SIZE, R, G, B);
const outputPath = path.join(__dirname, '..', 'images', 'icon.png');
fs.writeFileSync(outputPath, png);
console.log(`Icon generated: ${outputPath}`);
