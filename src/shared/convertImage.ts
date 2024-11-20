import * as sharp from 'sharp';
export async function convertImage (imageBuffer: Buffer) {
  try{
  const result = await sharp(imageBuffer).jpeg({ mozjpeg: true }).toBuffer()
  return result
  }catch(e){
    const convert = require('heic-convert');
    const inputBuffer = imageBuffer;
    const outputBuffer = await convert({
      buffer: inputBuffer, // the HEIC file buffer
      format: 'JPEG', // output format
    });
    const result = await sharp(outputBuffer).jpeg({ mozjpeg: true }).toBuffer();
    return result;
  }
}