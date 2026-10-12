import { manuscriptMarkdown, plainText } from "@pagina/domain";
import { jsPDF } from "jspdf";
import JSZip from "jszip";
import { KIND_LABEL, wordsOf, type Book } from "./books";
import { coverArt } from "./Cover";

type ChapterPayload = {
  title: string;
  body: string;
  scenes: { title: string; body: string }[];
};

type TextBlock = {
  heading: string;
  level: 1 | 2;
  text: string;
  chapterIndex: number;
};

function payload(book: Book) {
  return {
    title: book.title,
    penName: book.penName,
    chapters: book.chapters.map((chapter) => ({
      title: chapter.title,
      body: chapter.body,
      scenes: chapter.scenes.map((scene) => ({ title: scene.title, body: scene.body })),
    })),
  };
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadText(filename: string, content: string, type: string) {
  downloadBlob(filename, new Blob([content], { type }));
}

function slug(title: string) {
  return (
    title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "livro"
  );
}

function chapterBlocks(chapters: ChapterPayload[]): TextBlock[] {
  const blocks: TextBlock[] = [];
  chapters.forEach((chapter, chapterIndex) => {
    blocks.push({
      heading: chapter.title || "Sem título",
      level: 1,
      text: plainText(chapter.body || ""),
      chapterIndex,
    });
    for (const scene of chapter.scenes) {
      blocks.push({
        heading: scene.title || "Sem título",
        level: 2,
        text: plainText(scene.body || ""),
        chapterIndex,
      });
    }
  });
  return blocks;
}

function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function imageDataUrl(src: string): Promise<string | null> {
  try {
    if (src.startsWith("data:")) return src;
    const response = await fetch(src);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function imageFormat(dataUrl: string): "JPEG" | "PNG" | "WEBP" {
  if (dataUrl.startsWith("data:image/png")) return "PNG";
  if (dataUrl.startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

function ensureSpace(doc: jsPDF, y: number, need: number, margin: number, pageH: number) {
  if (y + need <= pageH - margin) return y;
  doc.addPage();
  return margin;
}

function writeParagraphs(
  doc: jsPDF,
  text: string,
  x: number,
  startY: number,
  width: number,
  size: number,
  margin: number,
  pageH: number,
  font: "times" | "helvetica" | "courier" = "times",
) {
  doc.setFont(font, "normal");
  doc.setFontSize(size);
  doc.setTextColor(20);
  const lineHeight = size * 1.55;
  let y = startY;
  const paragraphs = (text || "").split(/\n\n+/);

  for (const para of paragraphs) {
    const cleaned = para.replace(/\s*\n\s*/g, " ").trim();
    if (!cleaned) {
      y += size * 0.5;
      continue;
    }
    const lines = doc.splitTextToSize(cleaned, width) as string[];
    for (let i = 0; i < lines.length; i += 1) {
      y = ensureSpace(doc, y, lineHeight, margin, pageH);
      const line = lines[i] ?? "";
      const isLast = i === lines.length - 1;
      if (!isLast && lines.length > 1) {
        doc.text(line, x, y, { maxWidth: width, align: "justify" });
      } else {
        doc.text(line, x, y);
      }
      y += lineHeight;
    }
    y += size * 0.45;
  }
  return y;
}

async function drawCover(doc: jsPDF, book: Book, pageW: number, pageH: number) {
  const art = coverArt(book);
  const dataUrl = art ? await imageDataUrl(art) : null;

  if (dataUrl) {
    doc.setFillColor(12, 11, 16);
    doc.rect(0, 0, pageW, pageH, "F");
    const format = imageFormat(dataUrl);
    const props = doc.getImageProperties(dataUrl);
    const ratio = props.width / Math.max(1, props.height);
    const pageRatio = pageW / pageH;
    let drawW = pageW;
    let drawH = pageH;
    let x = 0;
    let y = 0;
    if (ratio > pageRatio) {
      drawH = pageH;
      drawW = pageH * ratio;
      x = (pageW - drawW) / 2;
    } else {
      drawW = pageW;
      drawH = pageW / ratio;
      y = (pageH - drawH) / 2;
    }
    doc.addImage(dataUrl, format, x, y, drawW, drawH);
    return;
  }

  const rgb = hslToRgb(book.cover.hue / 360, 0.34, 0.22);
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  doc.rect(0, 0, pageW, pageH, "F");
  doc.setTextColor(245, 240, 232);
  doc.setFont("times", "bold");
  doc.setFontSize(32);
  const titleLines = doc.splitTextToSize(book.title || "Sem título", pageW - 96) as string[];
  let ty = pageH * 0.38;
  for (const line of titleLines) {
    doc.text(line, pageW / 2, ty, { align: "center" });
    ty += 38;
  }
  if (book.penName) {
    doc.setFont("times", "normal");
    doc.setFontSize(14);
    doc.text(book.penName, pageW / 2, ty + 18, { align: "center" });
  }
  doc.setTextColor(0);
}

function drawTitlePage(doc: jsPDF, book: Book, pageW: number, pageH: number) {
  doc.setTextColor(90);
  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.text(KIND_LABEL[book.kind].toUpperCase(), pageW / 2, pageH * 0.28, { align: "center" });

  doc.setTextColor(20);
  doc.setFont("times", "bold");
  doc.setFontSize(28);
  const titleLines = doc.splitTextToSize(book.title || "Sem título", pageW - 120) as string[];
  let y = pageH * 0.36;
  for (const line of titleLines) {
    doc.text(line, pageW / 2, y, { align: "center" });
    y += 34;
  }

  doc.setDrawColor(160);
  doc.setLineWidth(0.6);
  doc.line(pageW / 2 - 36, y + 8, pageW / 2 + 36, y + 8);

  doc.setFont("times", "normal");
  doc.setFontSize(14);
  doc.text(book.penName || "Autor", pageW / 2, y + 36, { align: "center" });

  if (book.pitch.trim()) {
    doc.setFontSize(11);
    doc.setTextColor(70);
    const pitch = doc.splitTextToSize(book.pitch.trim(), pageW - 160) as string[];
    let py = y + 72;
    for (const line of pitch.slice(0, 6)) {
      doc.text(line, pageW / 2, py, { align: "center" });
      py += 16;
    }
  }
  doc.setTextColor(0);
}

function drawColophon(doc: jsPDF, book: Book, margin: number, width: number) {
  const year = new Date().getFullYear();
  const words = wordsOf(book).toLocaleString("pt-PT");
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(20);
  doc.text("Ficha técnica", margin, margin + 24);

  doc.setFont("times", "normal");
  doc.setFontSize(11);
  const lines = [
    `Título: ${book.title || "Sem título"}`,
    `Autor: ${book.penName || "—"}`,
    `Forma: ${KIND_LABEL[book.kind]}`,
    `Capítulos: ${book.chapters.length}`,
    `Palavras: ${words}`,
    `Ano: ${year}`,
    "",
    "Texto exportado a partir do manuscrito original.",
    "A composição tipográfica deste PDF é automática.",
    "",
    `© ${year} ${book.penName || book.title || "Autor"}. Todos os direitos reservados.`,
    "Gerado com Inklyst.",
  ];
  let y = margin + 56;
  for (const line of lines) {
    const wrapped = doc.splitTextToSize(line || " ", width) as string[];
    for (const row of wrapped) {
      doc.text(row, margin, y);
      y += 16;
    }
  }
}

function fillToc(
  doc: jsPDF,
  tocStartPage: number,
  tocPageCount: number,
  entries: { title: string; level: 1 | 2; page: number }[],
  margin: number,
  pageW: number,
  pageH: number,
  width: number,
) {
  let pageOffset = 0;
  let y = margin + 44;

  const openTocPage = () => {
    doc.setPage(tocStartPage + pageOffset);
    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.setTextColor(20);
    doc.text(pageOffset === 0 ? "Índice" : "Índice (cont.)", margin, margin + 12);
    y = margin + 44;
  };

  openTocPage();

  for (const entry of entries) {
    if (y > pageH - margin - 8) {
      if (pageOffset + 1 < tocPageCount) {
        pageOffset += 1;
        openTocPage();
      }
    }

    const indent = entry.level === 1 ? 0 : 16;
    const label = entry.title;
    const pageLabel = String(entry.page);
    doc.setFont("times", entry.level === 1 ? "bold" : "normal");
    doc.setFontSize(entry.level === 1 ? 12 : 11);
    doc.setTextColor(20);
    const labelWidth = Math.min(doc.getTextWidth(label), width - 48);
    const pageWidth = doc.getTextWidth(pageLabel);
    doc.text(label, margin + indent, y, { maxWidth: width - 48 });

    doc.setTextColor(150);
    doc.setFont("times", "normal");
    const dotsStart = margin + indent + labelWidth + 6;
    const dotsEnd = margin + width - pageWidth - 8;
    if (dotsEnd > dotsStart) {
      const step = doc.getTextWidth(". ");
      for (let dx = dotsStart; dx < dotsEnd; dx += step) doc.text(".", dx, y);
    }
    doc.setTextColor(20);
    doc.text(pageLabel, pageW - margin, y, { align: "right" });
    y += entry.level === 1 ? 20 : 16;
  }
}

export type PdfOptions = {
  font?: "times" | "helvetica" | "courier";
  fontSize?: number;
  margin?: number;
  includeCover?: boolean;
  includeToc?: boolean;
};

export function exportMarkdown(book: Book) {
  downloadText(`${slug(book.title)}.md`, manuscriptMarkdown(payload(book)), "text/markdown;charset=utf-8");
}

export async function exportPdf(book: Book, options: PdfOptions = {}) {
  const font = options.font ?? "times";
  const fontSize = options.fontSize ?? 11;
  const margin = options.margin ?? 64;
  const includeCover = options.includeCover !== false;
  const includeToc = options.includeToc !== false;

  const data = payload(book);
  const blocks = chapterBlocks(data.chapters);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const width = pageW - margin * 2;

  doc.setProperties({
    title: book.title || "Sem título",
    author: book.penName || "Autor",
    creator: "Inklyst",
    subject: KIND_LABEL[book.kind],
  });

  if (includeCover) {
    await drawCover(doc, book, pageW, pageH);
    doc.addPage();
  }

  drawTitlePage(doc, book, pageW, pageH);

  doc.addPage();
  drawColophon(doc, book, margin, width);

  let tocPageCount = 0;
  let tocStartPage = 0;
  if (includeToc) {
    tocPageCount = Math.max(1, Math.ceil(Math.max(blocks.length, 1) / 28));
    tocStartPage = doc.getNumberOfPages() + 1;
    for (let i = 0; i < tocPageCount; i += 1) doc.addPage();
  }

  const firstBodyPage = doc.getNumberOfPages() + 1;
  const tocEntries: { title: string; level: 1 | 2; page: number }[] = [];
  let y = margin;

  for (const block of blocks) {
    if (block.level === 1) {
      doc.addPage();
      y = margin + 64;

      const bodyPage = doc.getNumberOfPages() - firstBodyPage + 1;
      tocEntries.push({ title: block.heading, level: 1, page: bodyPage });

      doc.setFont(font, "normal");
      doc.setFontSize(fontSize);
      doc.setTextColor(120);
      doc.text(`Capítulo ${block.chapterIndex + 1}`, pageW / 2, y - 28, { align: "center" });

      doc.setTextColor(20);
      doc.setFont(font, "bold");
      doc.setFontSize(Math.max(fontSize + 8, 18));
      const heads = doc.splitTextToSize(block.heading, width - 24) as string[];
      for (const line of heads) {
        doc.text(line, pageW / 2, y, { align: "center" });
        y += 26;
      }
      doc.setDrawColor(180);
      doc.setLineWidth(0.5);
      doc.line(pageW / 2 - 28, y + 4, pageW / 2 + 28, y + 4);
      y += 32;

      if (block.text.trim()) {
        y = writeParagraphs(doc, block.text, margin, y, width, fontSize, margin, pageH, font);
      }
      continue;
    }

    if (doc.getNumberOfPages() < firstBodyPage) doc.addPage();
    y = ensureSpace(doc, y + 18, 48, margin, pageH);

    const bodyPage = doc.getNumberOfPages() - firstBodyPage + 1;
    tocEntries.push({ title: block.heading, level: 2, page: bodyPage });

    doc.setFont(font, "bold");
    doc.setFontSize(fontSize + 2);
    doc.setTextColor(20);
    const heads = doc.splitTextToSize(block.heading, width) as string[];
    for (const line of heads) {
      y = ensureSpace(doc, y, 18, margin, pageH);
      doc.text(line, margin, y);
      y += 18;
    }
    y += 8;
    if (block.text.trim()) {
      y = writeParagraphs(doc, block.text, margin, y, width, fontSize, margin, pageH, font);
    }
  }

  if (blocks.length === 0) {
    doc.addPage();
    doc.setFont(font, "normal");
    doc.setFontSize(12);
    doc.text("Este manuscrito ainda não tem capítulos.", margin, margin + 24);
  }

  if (includeToc && tocStartPage) {
    fillToc(doc, tocStartPage, tocPageCount, tocEntries, margin, pageW, pageH, width);
  }

  const total = doc.getNumberOfPages();
  for (let page = firstBodyPage; page <= total; page += 1) {
    doc.setPage(page);
    const n = page - firstBodyPage + 1;
    doc.setFont(font, "normal");
    doc.setFontSize(10);
    doc.setTextColor(110);
    doc.text(String(n), pageW / 2, pageH - 32, { align: "center" });
  }
  doc.setTextColor(0);

  downloadBlob(`${slug(book.title)}.pdf`, doc.output("blob"));
}

export async function exportDocx(book: Book) {
  const data = payload(book);
  const paragraphs: string[] = [];
  const push = (text: string, style?: string) => {
    const runs = xmlEscape(text || " ").split("\n").join("</w:t><w:br/><w:t>");
    paragraphs.push(
      `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ""}<w:r><w:t xml:space="preserve">${runs}</w:t></w:r></w:p>`,
    );
  };

  push(data.title, "Title");
  if (data.penName) push(data.penName);
  push("");
  for (const block of chapterBlocks(data.chapters)) {
    push(block.heading, block.level === 1 ? "Heading1" : "Heading2");
    for (const para of (block.text || "").split(/\n\n+/)) push(para.trim() || " ");
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs.join("\n")}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const zip = new JSZip();
  zip.file("[Content_Types].xml", contentTypes);
  zip.folder("_rels")?.file(".rels", rels);
  zip.folder("word")?.file("document.xml", documentXml);
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(`${slug(book.title)}.docx`, blob);
}

export async function exportEpub(book: Book) {
  const data = payload(book);
  const zip = new JSZip();
  const bookId = `urn:uuid:${crypto.randomUUID()}`;
  const chapters = chapterBlocks(data.chapters);

  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.folder("META-INF")?.file(
    "container.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
  );

  const manifest = chapters
    .map(
      (_, index) =>
        `<item id="chap${index}" href="chap${index}.xhtml" media-type="application/xhtml+xml"/>`,
    )
    .join("\n    ");
  const spine = chapters.map((_, index) => `<itemref idref="chap${index}"/>`).join("\n    ");
  const navPoints = chapters
    .map(
      (chapter, index) =>
        `<navPoint id="nav${index}" playOrder="${index + 1}"><navLabel><text>${xmlEscape(chapter.heading)}</text></navLabel><content src="chap${index}.xhtml"/></navPoint>`,
    )
    .join("\n    ");

  zip.folder("OEBPS")?.file(
    "content.opf",
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${xmlEscape(data.title)}</dc:title>
    <dc:creator>${xmlEscape(data.penName || "Autor")}</dc:creator>
    <dc:language>pt</dc:language>
    <dc:identifier id="BookId">${bookId}</dc:identifier>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${manifest}
  </manifest>
  <spine toc="ncx">
    ${spine}
  </spine>
</package>`,
  );

  zip.folder("OEBPS")?.file(
    "toc.ncx",
    `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head><meta name="dtb:uid" content="${bookId}"/></head>
  <docTitle><text>${xmlEscape(data.title)}</text></docTitle>
  <navMap>
    ${navPoints}
  </navMap>
</ncx>`,
  );

  chapters.forEach((chapter, index) => {
    const body = (chapter.text || "")
      .split(/\n\n+/)
      .map((para) => `<p>${xmlEscape(para).replaceAll("\n", "<br/>")}</p>`)
      .join("\n");
    zip.folder("OEBPS")?.file(
      `chap${index}.xhtml`,
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${xmlEscape(chapter.heading)}</title></head>
<body>
  <h${chapter.level === 1 ? "1" : "2"}>${xmlEscape(chapter.heading)}</h${chapter.level === 1 ? "1" : "2"}>
  ${body || "<p></p>"}
</body>
</html>`,
    );
  });

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(`${slug(book.title)}.epub`, blob);
}
