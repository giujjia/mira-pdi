import { GrayImage } from './types';
export function signedDisplay(img: GrayImage): { image: GrayImage; extent: number } {
  let extent = 0;
  for (const value of img.data) extent = Math.max(extent, Math.abs(value));
  const data = Float32Array.from(img.data, value => extent ? 127.5 + 127.5 * value / extent : 127.5);
  return { image: { width: img.width, height: img.height, data }, extent };
}
