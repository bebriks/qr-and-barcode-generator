const NUMERIC_RE = /^\d*$/;
const ALPHANUMERIC_RE = /^[\dA-Z $%*+\-./:]*$/;
const LATIN1_RE = /^[\x00-\xff]*$/;
const KANJI_RE = /^[\p{Script_Extensions=Han}\p{Script_Extensions=Hiragana}\p{Script_Extensions=Katakana}]*$/u;

const LOG = new Uint8Array(256);
const EXP = new Uint8Array(256);

const LENGTH_BITS = [
    [10, 12, 14],
    [9, 11, 13],
    [8, 16, 16],
    [8, 10, 12]
];

/* const MASK_FNS = [
    (row: number, column: number) => ((row + column) & 1) === 0,
    (row: number) => (row & 1) === 0,
    (row: number, column: number) => column % 3 === 0,
    (row: number, column: number) => (row + column) % 3 === 0,
    (row: number, column: number) => (((row >> 1) + Math.floor(column / 3)) & 1) === 0,
    (row: number, column: number) => ((row * column) & 1) + ((row * column) % 3) === 0,
    (row: number, column: number) => ((((row * column) & 1) + ((row * column) % 3)) & 1) === 0,
    (row: number, column: number) => ((((row + column) & 1) + ((row * column) % 3)) & 1) === 0,
]; */
type MaskFn = (row: number, column: number) => number;
export const ERROR_LEVELS = {
    EC_LEVEL_L: 0,
    EC_LEVEL_M: 1,
    EC_LEVEL_Q: 2,
    EC_LEVEL_H: 3
}
const MASK_FNS: MaskFn[] = [
    (row, column) => (((row + column) & 1) === 0 ? 1 : 0),
    (row) => ((row & 1) === 0 ? 1 : 0),
    (row, column) => (column % 3 === 0 ? 1 : 0),
    (row, column) => ((row + column) % 3 === 0 ? 1 : 0),
    (row, column) => ((((row >> 1) + Math.floor(column / 3)) & 1) === 0 ? 1 : 0),
      (row, column) => (((row * column) & 1) + ((row * column) % 3) === 0 ? 1 : 0),
      (row, column) => ((((row * column) & 1) + ((row * column) % 3) & 1) === 0 ? 1 : 0),
      (row, column) => ((((row + column) & 1) + ((row * column) % 3) & 1) === 0 ? 1 : 0),
  ];
  

export {NUMERIC_RE, ALPHANUMERIC_RE, LATIN1_RE, KANJI_RE, LENGTH_BITS, LOG, EXP, MASK_FNS}