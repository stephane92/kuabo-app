#!/usr/bin/env node
// Génère les icônes PWA Kuabo
// Usage: node generate-icons.mjs

import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Fond sombre arrondi
  const radius = size * 0.22;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fillStyle = '#0b0f1a';
  ctx.fill();

  // Cercle doré subtle
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.42, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(232, 184, 75, 0.08)';
  ctx.fill();

  // Lettre K
  ctx.fillStyle = '#e8b84b';
  ctx.font = `bold ${size * 0.52}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('K', size / 2, size / 2 + size * 0.03);

  return canvas.toBuffer('image/png');
}

try {
  mkdirSync('./public/icons', { recursive: true });

  for (const size of sizes) {
    const buffer = generateIcon(size);
    const path = `./public/icons/icon-${size}.png`;
    writeFileSync(path, buffer);
    console.log(`✅ Generated ${path}`);
  }

  // Apple touch icon (180px)
  const appleBuffer = generateIcon(180);
  writeFileSync('./public/apple-touch-icon.png', appleBuffer);
  console.log('✅ Generated apple-touch-icon.png');

  // Favicon (32px)
  const faviconBuffer = generateIcon(32);
  writeFileSync('./public/favicon-32.png', faviconBuffer);
  console.log('✅ Generated favicon-32.png');

  console.log('\n🎉 Toutes les icônes générées !');
} catch (err) {
  console.error('Erreur:', err.message);
  console.log('\n💡 Si canvas n\'est pas installé:');
  console.log('npm install canvas');
  console.log('puis: node generate-icons.mjs');
}
