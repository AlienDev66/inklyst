import { paginateManuscript, type ShelfEdition } from "@pagina/domain";

function book(input: {
  id: string;
  title: string;
  penName: string;
  pitch: string;
  coverHue: number;
  coverImage: string;
  visibility?: "public" | "beta";
  betaCode: string;
  publishedAt: number;
  genre?: string;
  tags?: string[];
  complete?: boolean;
  chapters: { id: string; title: string; body: string }[];
}): ShelfEdition {
  const pages = paginateManuscript(input.chapters, 520);
  return {
    id: input.id,
    bookId: input.id,
    title: input.title,
    penName: input.penName,
    pitch: input.pitch,
    coverHue: input.coverHue,
    coverImage: input.coverImage,
    publishedAt: input.publishedAt,
    visibility: input.visibility ?? "public",
    betaCode: input.betaCode,
    chapters: input.chapters,
    pages,
    genre: input.genre,
    tags: input.tags,
    complete: input.complete,
  };
}

/** Livros de teste com prosa real — vários cenários de leitura. */
export const SAMPLE_BOOKS: ShelfEdition[] = [
  book({
    id: "sample-mesa",
    title: "A mesa da cozinha",
    penName: "Marina Vale",
    pitch: "Duas pessoas, um livro, e uma margem que só abre quando chegas lá.",
    coverHue: 332,
    coverImage: "/covers/sample-mesa.jpg",
    betaCode: "MESA",
    publishedAt: Date.UTC(2026, 2, 1),
    genre: "Romance",
    tags: ["margem", "leitura-a-dois", "cozinha"],
    complete: true,
    chapters: [
      {
        id: "c1",
        title: "A chávena",
        body: `A mesa ainda tinha o círculo da chávena. Ele notou-o antes de notar o livro — um anel castanho, ligeiramente oval, como se a chávena tivesse sido pousada à pressa e depois esquecida.

O livro estava aberto no meio. Não na primeira página, não na última: no sítio exacto onde a leitura tinha parado a meio de uma frase. A margem, a lápis, alguém tinha escrito um nome e depois apagado mal. Ficavam vestígios de letras, como se a borracha tivesse vergonha do que apagara.

Ele leu a primeira linha duas vezes e não passou à segunda. Não porque a frase fosse difícil. Porque a cozinha cheirava a laranja e a pó, e aquilo misturava-se com a memória de outra cozinha, noutra cidade, onde alguém lhe tinha dito: «Não abras a margem antes de chegares.»

Lá fora começou a chover sobre o zinco. O som era tão alto que o livro pareceu mais pequeno — ou a chuva mais íntima. Ele dobrou o canto da página sem querer e alisou-o com a unha, como se pedisse desculpa ao papel.

No fim do capítulo havia uma frase riscada. Dava para ler na mesma. Dizia uma coisa que ele ainda não estava pronto a saber — ou pronto a admitir que já sabia.

Fechou o livro em cima do dedo, para não perder o sítio dela. Na mesa, o círculo da chávena ainda estava quente ao toque. Impossível. A chávena tinha desaparecido.`,
      },
      {
        id: "c2",
        title: "A segunda chávena",
        body: `De manhã havia outra chávena. Limpa. Sem círculo. Ao lado, um bilhete com a letra dela:

«Se leste até ao risco, já sabes. Se não, espera pela página sete. Eu estarei na margem.»

Ele abriu o livro outra vez. A frase riscada tinha mudado. Ou a memória é que tinha. Na margem nova, a tinta ainda fresca, lia-se só: «Continua.»`,
      },
    ],
  }),
  book({
    id: "sample-vento",
    title: "Wind of Change",
    penName: "Domingos Capitango",
    pitch: "Thriller psicológico. Alguém está a reescrever as memórias da cidade.",
    coverHue: 24,
    coverImage: "/covers/sample-vento.jpg",
    betaCode: "WIND",
    publishedAt: Date.UTC(2026, 5, 12),
    genre: "Thriller",
    tags: ["memória", "cidade", "suspense"],
    complete: false,
    chapters: [
      {
        id: "c12",
        title: "Capítulo 12",
        body: `O vento mudou de direção à mesma hora em que o elevador parou entre andares. Não houve solavanco — apenas a sensação de que o edifício tinha respirado fundo e se esquecido de expirar.

Na cabine havia um cartaz antigo, plastificado, com as bordas amarelas: «Se ouvires o teu nome duas vezes, não respondas.» Ele leu em voz alta, por hábito de quem vive só. A voz que veio do interfone não era a dele. Era mais jovem. Ou mais antiga. Difícil dizer.

— Estás no sítio errado — disse o interfone.

Ele olhou para o painel. Os números piscavam: 11, 12, 11, 12. No espelho, o reflexo piscou primeiro — um atraso de meio segundo, como um vídeo barato a carregar. Quando as portas abriram, o corredor tinha o cheiro do apartamento da infância: sabão azul, peixe frito, chuva em cimento quente. Impossível. O prédio era de 2024.

No tapete, alguém tinha desenhado com giz o mapa da cidade. Faltava a rua onde ele nasceu. No sítio exacto havia um X e uma data: amanhã.

Uma nota na porta 12-B, escrita com a mesma letra do cartaz do elevador: «Leste até aqui. Agora escolhe o que esquecer.»

Ele dobrou a nota e sentiu o papel quente — como se ainda estivesse a ser escrito do outro lado da porta. Lá fora, o vento trouxe o nome dela. Desta vez, não respondeu.

Por baixo da porta passou um segundo bilhete, ainda a ser empurrado: «Bom. A memória é um contrato. Assina a página seguinte ou perde o capítulo onze.»`,
      },
      {
        id: "c13",
        title: "Capítulo 13",
        body: `Assinou com o polegar, porque não havia caneta. A tinta saiu vermelha. Não era sangue — era pior: era a cor exacta do cartaz do elevador.

No elevador, o cartaz tinha mudado. Agora dizia: «Se ouvires o teu nome uma vez, é ela. Se ouvires duas, és tu a chamar-te de volta.»

O vento, na rua, soprava na direção contrária ao trânsito. As pessoas caminhavam como se não notassem. Só ele notava. Só ele — e o reflexo no vidro do café, que agora já não atrasava. Iam sincronizados. Isso assustava mais.`,
      },
    ],
  }),
  book({
    id: "sample-cartas",
    title: "Cartas que não enviei",
    penName: "Amina Dias",
    pitch: "Romance em fragmentos. Luanda, Lisboa, e tudo o que ficou por dizer.",
    coverHue: 18,
    coverImage: "/covers/sample-cartas.jpg",
    betaCode: "CARTAS",
    publishedAt: Date.UTC(2026, 1, 20),
    genre: "Romance",
    tags: ["cartas", "luanda", "lisboa", "distância"],
    complete: true,
    chapters: [
      {
        id: "c1",
        title: "Março",
        body: `Escrevi a primeira carta no autocarro, com o joelho a bater no da desconhecida ao lado. A letra saiu torta porque a estrada também estava.

«Se esta chegar às tuas mãos, é porque finalmente tive coragem — ou porque alguém a encontrou no chão.»

Risquei o parágrafo. Guardei o papel na capa do livro que nunca te emprestei. Em Lisboa a chuva era fina, quase educada. Em Luanda, a tua voz ainda era o barulho da tarde: geradores, rádio, alguém a vender manga no meio da rua.

A segunda carta falava só do cheiro a peixe grelhado e a gasóleo no porto. Tu rias disso. Dizias que o amor cheirava a coisas concretas, senão era só poema.

A terceira não tinha destinatário. Tinha só: «Volta quando o medo cansar.»

Hoje abri a gaveta. As cartas estavam todas lá — e uma a mais, com a tua letra. O envelope não tinha selo. Dentro, uma única folha:

«Também não enviei. Mas li as tuas todas. A do porto é a minha preferida. Continua. Eu estou na margem da quarta.»`,
      },
      {
        id: "c2",
        title: "Abril",
        body: `A quarta carta escrevi-a de pé, na cozinha, porque sentada a mão tremia mais.

Contei-te do elevador do prédio novo que para entre andares. Contei-te que sonhei contigo a apagar um nome a lápis numa margem. Contei-te que guardei o círculo da chávena na mesa durante três dias, como se fosse prova.

No fim, não risquei nada. Pela primeira vez.

Quando fechei o envelope, havia alguém a bater à porta. Não abri. Encostei a orelha à madeira e ouvi a tua respiração — ou a minha. Às vezes são a mesma coisa, quando a distância cansa.`,
      },
    ],
  }),
  book({
    id: "sample-elevador",
    title: "O último elevador",
    penName: "Rui Mendes",
    pitch: "Tensão em tempo real. Sete andares. Uma mentira por piso.",
    coverHue: 210,
    coverImage: "/covers/sample-elevador.jpg",
    visibility: "beta",
    betaCode: "LIFT",
    publishedAt: Date.UTC(2026, 7, 3),
    genre: "Thriller",
    tags: ["elevador", "tensão", "confissão"],
    complete: false,
    chapters: [
      {
        id: "c1",
        title: "Piso 0",
        body: `O botão do rés-do-chão acendeu sozinho. Ninguém o tinha premido. A mulher de casaco vermelho ajeitou a mala e disse, sem olhar para ti:

— Eu desço no três.

Mentira. O crachá dela, meio escondido pela gola, era do sétimo. Tu viste. Ela sabia que tinhas visto.

No um, entrou um miúdo com uma caixa de cartão. Dentro, algo mexia — leve, irregular, como um pássaro ou um telemóvel a vibrar. Ele sorriu como quem já sabe o fim do filme.

— Não abras — murmurou, para ti ou para a caixa. Impossível saber.

No dois, a luz falhou dois segundos. Quando voltou, a mulher de vermelho já não estava. A mala sim. Aberta. Vazia. Cheirava a chuva em zinco.

No três, o miúdo saiu. A caixa ficou. Ninguém a reclamou. O painel mostrou o três a piscar, como se pedisse confirmação.

No quatro, ouviu-se a caixa a abrir. Sozinha. Não havia nada lá dentro — só um espelho partido, reflectindo o tecto do elevador e, por um instante, o teu rosto com os olhos fechados. Tu tinhas-os abertos.

No cinco, o reflexo no espelho partido acenou. Tu não.

No seis, as portas recusaram abrir. O painel mostrou uma mensagem nova, a verde: «Última paragem. Confessa.»

No sete, encontraste a mulher de vermelho. Segurava o teu crachá entre dois dedos, como quem segura um fósforo.

— Agora sim — disse ela. — Desces.

Por detrás dela, o corredor do sétimo era a cozinha da infância. A mesa tinha o círculo da chávena. Em cima, o livro aberto na frase riscada.`,
      },
    ],
  }),
  book({
    id: "sample-areia",
    title: "Areia sob as unhas",
    penName: "Leila Nascimento",
    pitch: "Não-ficção íntima. Uma viagem, um pai, e o que a praia não devolve.",
    coverHue: 38,
    coverImage: "/covers/sample-areia.jpg",
    betaCode: "AREIA",
    publishedAt: Date.UTC(2025, 10, 8),
    genre: "Não-ficção",
    tags: ["memória", "praia", "pai"],
    complete: true,
    chapters: [
      {
        id: "c1",
        title: "Primeira maré",
        body: `O meu pai dizia que a areia sob as unhas era prova de que o dia tinha valido a pena. Eu tinha seis anos e acreditava em tudo o que vinha com sal nos lábios.

Anos depois, na mesma praia, as unhas estavam limpas. Demasiado limpas. Eu tinha vindo para enterrar uma urna pequena — não cinzas, documentos. O cartório pediu cópias; o mar pediu silêncio.

Sentei-me onde a rebentação deixava espuma em forma de perguntas. Li em voz alta a primeira página do caderno dele. A letra era igual à minha quando estou cansada. Contava a viagem de 1987, o motor a falhar, a mulher que lhe deu água sem perguntar o nome.

«Se um dia leres isto,» escrevia, «não procures a mulher. Procura a sede.»

Fiquei até o sol baixar. A areia voltou a entrar sob as unhas. Desta vez, não limpei.`,
      },
    ],
  }),
];

export const SAMPLE_NOTES: {
  id: string;
  editionId: string;
  author: string;
  anchorPage: number;
  body: string;
  at: number;
}[] = [
  {
    id: "note-mesa-2",
    editionId: "sample-mesa",
    author: "Tu",
    anchorPage: 2,
    body: "Esta linha parece escrita para ser lida em voz alta.",
    at: 0,
  },
  {
    id: "note-mesa-3",
    editionId: "sample-mesa",
    author: "Marina",
    anchorPage: 3,
    body: "O nome apagado é o da irmã. Só se percebe quando se chega aqui.",
    at: 0,
  },
  {
    id: "note-vento-2",
    editionId: "sample-vento",
    author: "Alex",
    anchorPage: 2,
    body: "O atraso do reflexo — isto volta no 13?",
    at: 0,
  },
  {
    id: "note-cartas-2",
    editionId: "sample-cartas",
    author: "Tu",
    anchorPage: 2,
    body: "A carta do porto… guardei isto.",
    at: 0,
  },
  {
    id: "note-lift-3",
    editionId: "sample-elevador",
    author: "Sam",
    anchorPage: 3,
    body: "A caixa vazia com espelho — spoilers na margem trancada.",
    at: 0,
  },
];

export function isSampleEdition(id: string) {
  return id.startsWith("sample-");
}

export function mergeSampleBooks(existing: ShelfEdition[]): ShelfEdition[] {
  const ids = new Set(existing.map((item) => item.id));
  const extras = SAMPLE_BOOKS.filter((book) => !ids.has(book.id));
  return [...extras, ...existing];
}

/** Local shelf + cloud — same bookId keeps the newest. Samples only fill an empty shelf. */
export function mergeCatalog(...lists: ShelfEdition[][]): ShelfEdition[] {
  const byBook = new Map<string, ShelfEdition>();
  for (const list of lists) {
    for (const item of list) {
      const key = item.bookId || item.id;
      const prev = byBook.get(key);
      if (!prev || (item.publishedAt ?? 0) >= (prev.publishedAt ?? 0)) {
        byBook.set(key, item);
      }
    }
  }
  const merged = [...byBook.values()].sort((a, b) => b.publishedAt - a.publishedAt);
  const real = merged.filter((item) => !isSampleEdition(item.id));
  if (real.length > 0) return real;
  return mergeSampleBooks(merged);
}

export function notesForSample(editionId: string) {
  return SAMPLE_NOTES.filter((note) => note.editionId === editionId);
}
