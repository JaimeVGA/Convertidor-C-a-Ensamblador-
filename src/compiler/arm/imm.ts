export function ror32(val: number, bits: number): number {
  const b = bits & 31;
  if (b === 0) return val >>> 0;
  return (((val >>> b) | (val << (32 - b))) >>> 0);
}

/**
 * Encodes a 32-bit value into ARM32's 12-bit rotated immediate (rot4, imm8)
 * where effective value = ror32(imm8, rot4 * 2).
 */
export function encodeArmImm(val: number): { rot: number; imm8: number } | null {
  const u = val >>> 0;
  for (let rot = 0; rot < 16; rot++) {
    const shiftLeft = (rot * 2) & 31;
    const candidate = shiftLeft === 0 ? u : (((u << shiftLeft) | (u >>> (32 - shiftLeft))) >>> 0);
    if (candidate <= 0xff) {
      return { rot, imm8: candidate };
    }
  }
  return null;
}

export function decodeArmImm(rot: number, imm8: number): number {
  return ror32(imm8 & 0xff, (rot & 0xf) * 2) | 0;
}

export function canEncodeArmLiteral(val: number): boolean {
  return encodeArmImm(val) !== null || encodeArmImm(~val) !== null;
}
