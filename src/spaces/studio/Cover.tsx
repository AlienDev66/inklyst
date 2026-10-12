import { KIND_LABEL, type Book, type Cover } from "./books";

export function CoverFace({
  book,
  size = "shelf",
}: {
  book: Pick<Book, "title" | "penName" | "kind" | "cover">;
  size?: "shelf" | "hero" | "rail" | "thumb";
}) {
  return (
    <span className={`cover ${size}`} style={coverStyle(book.cover, book.title)}>
      {coverArt(book) ? null : <span className="cover-spine" aria-hidden />}
      {coverArt(book) ? null : (
        <span className="cover-copy">
          <span className="cover-kind">{KIND_LABEL[book.kind]}</span>
          <span className="cover-title">{book.title || "Sem título"}</span>
          {book.penName ? <span className="cover-by">{book.penName}</span> : null}
        </span>
      )}
    </span>
  );
}

const PLATES: Record<string, string> = {
  "Casa vazia": "/covers/casa.jpg",
  "O inverno do cais": "/covers/inverno.jpg",
  "Cartas sem selo": "/covers/cartas.jpg",
};

export function coverArt(book: { title: string; cover: Cover }) {
  return book.cover.image || PLATES[book.title];
}

export function coverStyle(cover: Cover, title = ""): { background: string } {
  const image = cover.image || PLATES[title];
  if (image) {
    return {
      background: `center / cover no-repeat url("${image}")`,
    };
  }
  return { background: `hsl(${cover.hue} 34% 28%)` };
}

export function fileToCover(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 720 / image.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("capa recusada"));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.onerror = () => reject(new Error("capa recusada"));
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
