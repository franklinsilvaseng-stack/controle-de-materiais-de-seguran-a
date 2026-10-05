import fs from "node:fs";
import zlib from "node:zlib";

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(tipo, dados) {
  const nome = Buffer.from(tipo);
  const tamanho = Buffer.alloc(4);
  tamanho.writeUInt32BE(dados.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([nome, dados])));
  return Buffer.concat([tamanho, nome, dados, crc]);
}
function png(tamanho) {
  const cru = Buffer.alloc((tamanho * 3 + 1) * tamanho);
  for (let y = 0; y < tamanho; y++) {
    const linha = y * (tamanho * 3 + 1);
    cru[linha] = 0;
    for (let x = 0; x < tamanho; x++) {
      const i = linha + 1 + x * 3;
      const borda = x < tamanho * 0.08 || y < tamanho * 0.08 || x > tamanho * 0.92 || y > tamanho * 0.92;
      cru[i] = borda ? 0xca : 0x18;
      cru[i + 1] = borda ? 0xb7 : 0x4a;
      cru[i + 2] = borda ? 0x7d : 0x4e;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(tamanho, 0);
  ihdr.writeUInt32BE(tamanho, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(cru)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
fs.writeFileSync("public/icon-192.png", png(192));
fs.writeFileSync("public/icon-512.png", png(512));
console.log("ícones gravados");
