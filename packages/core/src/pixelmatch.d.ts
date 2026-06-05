// Fix: pixelmatch has no types
declare module "pixelmatch" {
  interface PixelmatchOptions {
    threshold?: number;
    includeAA?: boolean;
    alpha?: number;
    diffColor?: [number, number, number];
    diffColorAlt?: [number, number, number];
    diffMask?: boolean;
  }
  export default function pixelmatch(
    img1: Buffer,
    img2: Buffer,
    output: Buffer,
    width: number,
    height: number,
    options?: PixelmatchOptions
  ): number;
}
