import { ALPHANUMERIC_RE, KANJI_RE, LATIN1_RE, NUMERIC_RE, LENGTH_BITS, LOG, EXP, MASK_FNS }from "@/const/const";

export function getEncodingMode(string: string) {
    if (NUMERIC_RE.test(string)) {
      return 0b0001
    }
    if (ALPHANUMERIC_RE.test(string)) {
      return 0b0010
    }
    if (LATIN1_RE.test(string)) {
      return 0b0100
    }
    if (KANJI_RE.test(string)) {
      return 0b1000
    }
    return 0b0111
}

export function getLengthBits(mode: number, version: number) {
    const modeIndex = 31 - Math.clz32(mode)
    const bitsIndex = version > 26 ? 2 : version > 9 ? 1 : 0
    return LENGTH_BITS[modeIndex][bitsIndex]
}

export function mul(a: number, b: number) {
    return a && b ? EXP[(LOG[a] + LOG[b]) % 255] : 0;
}
export function div(a: number, b: number): number {
    return EXP[(LOG[a] + LOG[b] * 254) % 255];
}
  

export function getByteData(content: string, lengthBits: number, dataCodewords: number) {
    const data = new Uint8Array(dataCodewords);
    const rightShift = (4 + lengthBits) & 7;
    const leftShift = 8 - rightShift;
    const andMask = (1 << rightShift) - 1;
    const dataIndexStart = lengthBits > 12 ? 2 : 1;
  
    data[0] = 64 /* byte mode */ + (content.length >> (lengthBits - 4));
    if (lengthBits > 12) {
      data[1] = (content.length >> rightShift) & 255;
    }
    data[dataIndexStart] = (content.length & andMask) << leftShift;
  
    for (let index = 0; index < content.length; index++) {
      const byte = content.charCodeAt(index);
      data[index + dataIndexStart] |= byte >> rightShift;
      data[index + dataIndexStart + 1] = (byte & andMask) << leftShift;
    }
    const remaining = dataCodewords - content.length - dataIndexStart - 1;
    for (let index = 0; index < remaining; index++) {
      const byte = index & 1 ? 17 : 236;
      data[index + content.length + 2] = byte;
    }
    return data;
}

export function polyMul(poly1: Uint8Array, poly2: Uint8Array) {
    // This is going to be the product polynomial, that we pre-allocate.
    // We know it's going to be `poly1.length + poly2.length - 1` long.
    const coeffs = new Uint8Array(poly1.length + poly2.length - 1);
  
    // Instead of executing all the steps in the example, we can jump to
    // computing the coefficients of the result
    for (let index = 0; index < coeffs.length; index++) {
      let coeff = 0;
      for (let p1index = 0; p1index <= index; p1index++) {
        const p2index = index - p1index;
        // We *should* do better here, as `p1index` and `p2index` could
        // be out of range, but `mul` defined above will handle that case.
        // Just beware of that when implementing in other languages.
        coeff ^= mul(poly1[p1index], poly2[p2index]);
      }
      coeffs[index] = coeff;
    }
    return coeffs;
}

export function polyRest(dividend: Uint8Array, divisor: Uint8Array) {
    const quotientLength = dividend.length - divisor.length + 1;
    // Let's just say that the dividend is the rest right away
    let rest = new Uint8Array(dividend);
    for (let count = 0; count < quotientLength; count++) {
      // If the first term is 0, we can just skip this iteration
      if (rest[0]) {
        const factor = div(rest[0], divisor[0]);
        const subtr = new Uint8Array(rest.length);
        subtr.set(polyMul(divisor, Uint8Array.from([factor])), 0);
        rest = rest.map((value, index) => value ^ subtr[index]).slice(1);
      } else {
        rest = rest.slice(1);
      }
    }
    return rest;
}

export function getGeneratorPoly(degree: number) {
    let lastPoly = new Uint8Array([1]);
    for (let index = 0; index < degree; index++) {
      lastPoly = polyMul(lastPoly, new Uint8Array([1, EXP[index]]));
    }
    return lastPoly;
}
  
export function getEDC(data: Uint8Array, codewords: number) {
    const degree = codewords - data.length;
    const messagePoly = new Uint8Array(codewords);
    messagePoly.set(data, 0);
    return polyRest(messagePoly, getGeneratorPoly(degree));
}

export function getSize(version: number) {
    return version * 4 + 17;
}
export function getNewMatrix(version: number) {
    const length = getSize(version);
    return Array.from({ length }, () => new Uint8Array(length));
}
export function fillArea(matrix: Uint8Array[], row: number, column: number, width: number, height: number, fill = 1) {
    const fillRow = new Uint8Array(width).fill(fill);
    for (let index = row; index < row + height; index++) {
      // YES, this mutates the matrix. Watch out!
      matrix[index].set(fillRow, column);
    }
}

export function getModuleSequence(version: number) {
    const matrix = getNewMatrix(version);
    const size = getSize(version);
  
    // Finder patterns + divisors
    fillArea(matrix, 0, 0, 9, 9);
    fillArea(matrix, 0, size - 8, 8, 9);
    fillArea(matrix, size - 8, 0, 9, 8);
    // Alignment pattern - yes, we just place one. For the general
    // implementation, wait for the next parts in the series!
    fillArea(matrix, size - 9, size - 9, 5, 5);
    // Timing patterns
    fillArea(matrix, 6, 9, version * 4, 1);
    fillArea(matrix, 9, 6, 1, version * 4);
    // Dark module
    matrix[size - 8][8] = 1;
  
    let rowStep = -1;
    let row = size - 1;
    let column = size - 1;
    const sequence = [];
    let index = 0;
    while (column >= 0) {
      if (matrix[row][column] === 0) {
        sequence.push([row, column]);
      }
      // Checking the parity of the index of the current module
      if (index & 1) {
        row += rowStep;
        if (row === -1 || row === size) {
          rowStep = -rowStep;
          row += rowStep;
          column -= column === 7 ? 2 : 1;
        } else {
          column++;
        }
      } else {
        column--;
      }
      index++;
    }
    return sequence;
}

export function getRawQRCode(message: string) {
    const VERSION = 2;
    const TOTAL_CODEWORDS = 44;
    const LENGTH_BITS = 8;
    const DATA_CODEWORDS = 28;
  
    const codewords = new Uint8Array(TOTAL_CODEWORDS);
    const byteData = getByteData(message, LENGTH_BITS, DATA_CODEWORDS);
    codewords.set(byteData, 0);
    codewords.set(getEDC(byteData, TOTAL_CODEWORDS), DATA_CODEWORDS);
  
    const size = getSize(VERSION);
    const qrCode = getNewMatrix(VERSION);
    const moduleSequence = getModuleSequence(VERSION);

    [[0, 0], [size - 7, 0], [0, size - 7]].forEach(([row, col]) => {
      fillArea(qrCode, row, col, 7, 7);
      fillArea(qrCode, row + 1, col + 1, 5, 5, 0);
      fillArea(qrCode, row + 2, col + 2, 3, 3);
    });
    fillArea(qrCode, 7, 0, 8, 1, 0);
    fillArea(qrCode, 0, 7, 1, 7, 0);
    fillArea(qrCode, size - 8, 0, 8, 1, 0);
    fillArea(qrCode, 0, size - 8, 1, 7, 0);
    fillArea(qrCode, 7, size - 8, 8, 1, 0);
    fillArea(qrCode, size - 7, 7, 1, 7, 0);
    fillArea(qrCode, size - 9, size - 9, 5, 5);
    fillArea(qrCode, size - 8, size - 8, 3, 3, 0);
    qrCode[size - 7][size - 7] = 1;
    for (let pos = 8; pos < VERSION * 4 + 8; pos += 2) {
      qrCode[6][pos] = 1;
      qrCode[6][pos + 1] = 0;
      qrCode[pos][6] = 1;
      qrCode[pos + 1][6] = 0;
    }
    qrCode[6][size - 7] = 1;
    qrCode[size - 7][6] = 1;
    qrCode[size - 8][8] = 1;
  
    let index = 0;
    for (const codeword of codewords) {
      for (let shift = 7; shift >= 0; shift--) {
        const bit = (codeword >> shift) & 1;
        const [row, column] = moduleSequence[index];
        index++;
        qrCode[row][column] = bit;
      }
    }
    return qrCode;
}

function getMaskedMatrix(version: number, codewords: Uint8Array, maskIndex: number) {
  const sequence = getModuleSequence(version);
  const matrix = getNewMatrix(version);
  sequence.forEach(([ row, column ], index) => {
    const codeword = codewords[index >> 3];
    const bitShift = 7 - (index & 7);
    const moduleBit = (codeword >> bitShift) & 1;
    matrix[row][column] = moduleBit ^ MASK_FNS[maskIndex](row, column);
  });
  return matrix;
}

const EDC_ORDER = 'MLHQ';
const FORMAT_DIVISOR = new Uint8Array([1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 1]);
const FORMAT_MASK = new Uint8Array([1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0]);
export function getFormatModules(errorLevel: string, maskIndex: number) {
  const formatPoly = new Uint8Array(15);
  const errorLevelIndex = EDC_ORDER.indexOf(errorLevel);
  formatPoly[0] = errorLevelIndex >> 1;
  formatPoly[1] = errorLevelIndex & 1;
  formatPoly[2] = maskIndex >> 2;
  formatPoly[3] = (maskIndex >> 1) & 1;
  formatPoly[4] = maskIndex & 1;
  const rest = polyRest(formatPoly, FORMAT_DIVISOR);
  formatPoly.set(rest, 5);
  const maskedFormatPoly = formatPoly.map(
    (bit, index) => bit ^ FORMAT_MASK[index]
  );
  return maskedFormatPoly;
}

export function placeFixedPatterns(matrix: Uint8Array[]) {
  const size = matrix.length;
  // Finder patterns
  [[0, 0], [size - 7, 0], [0, size - 7]].forEach(([row, col]) => {
    fillArea(matrix, row, col, 7, 7);
    fillArea(matrix, row + 1, col + 1, 5, 5, 0);
    fillArea(matrix, row + 2, col + 2, 3, 3);
  });
  // Separators
  fillArea(matrix, 7, 0, 8, 1, 0);
  fillArea(matrix, 0, 7, 1, 7, 0);
  fillArea(matrix, size - 8, 0, 8, 1, 0);
  fillArea(matrix, 0, size - 8, 1, 7, 0);
  fillArea(matrix, 7, size - 8, 8, 1, 0);
  fillArea(matrix, size - 7, 7, 1, 7, 0);
  // Alignment pattern
  fillArea(matrix, size - 9, size - 9, 5, 5);
  fillArea(matrix, size - 8, size - 8, 3, 3, 0);
  matrix[size - 7][size - 7] = 1;
  // Timing patterns
  for (let pos = 8; pos < size - 9; pos += 2) {
    matrix[6][pos] = 1;
    matrix[6][pos + 1] = 0;
    matrix[pos][6] = 1;
    matrix[pos + 1][6] = 0;
  }
  matrix[6][size - 7] = 1;
  matrix[size - 7][6] = 1;
  // Dark module
  matrix[size - 8][8] = 1;
}

export function placeFormatModules(matrix: Uint8Array[], errorLevel: string, maskIndex: number) {
  const formatModules = getFormatModules(errorLevel, maskIndex);
  matrix[8].set(formatModules.subarray(0, 6), 0);
  matrix[8].set(formatModules.subarray(6, 8), 7);
  matrix[8].set(formatModules.subarray(7), matrix.length - 8);
  matrix[7][8] = formatModules[8];
  formatModules.subarray(0, 7).forEach(
    (cell, index) => (matrix[matrix.length - index - 1][8] = cell)
  );
  formatModules.subarray(9).forEach(
    (cell, index) => (matrix[5 - index][8] = cell)
  );
}

export function getMaskedQRCode(version: number, codewords: Uint8Array, errorLevel: string, maskIndex: number) {
  const matrix = getMaskedMatrix(version, codewords, maskIndex);
  placeFormatModules(matrix, errorLevel, maskIndex);
  placeFixedPatterns(matrix);
  return matrix;
}