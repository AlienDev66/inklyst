import { ArrowRight, ArrowUpRight } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useRef, useState } from "react";
import { WriteDemo } from "./WriteDemo";

type Props = {
  onEnter: (mode?: "in" | "up") => void;
  local?: boolean;
};

const CRAFT = [
  "manuscrito",
  "cenas",
  "actos",
  "bíblia",
  "cronologia",
  "relações",
  "memória",
  "versões",
  "beta",
  "exportar",
];

const FLOW = [
  {
    n: "01",
    t: "Escreves",
    d: "No estúdio: capítulos, cenas, notas à margem e memória que se acumula.",
    detail: "Actos, versões e o ritmo diário — sem sair do manuscrito.",
    sample: "A chávena ainda está quente. Ela pousou a mão no bordo e não bebeu.",
  },
  {
    n: "02",
    t: "Acompanhas",
    d: "Mundo, bíblia e cronologia — o livro lembra-se do que tu já decidiste.",
    detail: "Idades, segredos e relações ligadas aos capítulos onde aparecem.",
    sample: "Ela · 34 anos · segredo: a cadeira não era dela.",
  },
  {
    n: "03",
    t: "Partilhas",
    d: "Publicas e o Reader abre no mesmo Inklyst — estante de leitura à parte.",
    detail: "Um link, um código — o leitor vê o livro, não o rascunho.",
    sample: "Beta  WIND-AB12  ·  edição pronta no Reader",
  },
] as const;

const CHAPTERS = [
  {
    id: "casa",
    index: "01",
    title: "A casa",
    words: 842,
    status: "revisão",
    scene: "A porta",
    body: "A chuva tinha parado há pouco, mas o cheiro a terra molhada ainda vinha da rua. Ela pousou a caneta — não porque a frase estivesse pronta, mas porque finalmente ouvia o silêncio certo.",
  },
  {
    id: "rua",
    index: "02",
    title: "A rua",
    words: 510,
    status: "rascunho",
    scene: "O café",
    body: "Do outro lado do vidro, o vizinho acendia um cigarro e fingia não a ver. A cidade continuava — e ela descobriu que o mais difícil não era partir: era ficar e parecer intacta.",
  },
  {
    id: "regresso",
    index: "03",
    title: "O regresso",
    words: 120,
    status: "ideia",
    scene: "—",
    body: "A chave ainda cabia na fechadura. Isso também era novo — ou era ela que já não reconhecia o peso de voltar.",
  },
] as const;

const PEOPLE = [
  {
    id: "ela",
    name: "Ela",
    x: 24,
    y: 36,
    age: "34 anos",
    fear: "voltar a entrar",
    secret: "a cadeira",
    role: "protagonista",
  },
  {
    id: "ele",
    name: "Ele",
    x: 74,
    y: 26,
    age: "38 anos",
    fear: "pedir perdão tarde",
    secret: "a carta nunca enviada",
    role: "interesse",
  },
  {
    id: "irma",
    name: "Irmã",
    x: 70,
    y: 70,
    age: "29 anos",
    fear: "perder a casa",
    secret: "sabe quem tirou a cadeira",
    role: "família",
  },
  {
    id: "vizinho",
    name: "Vizinho",
    x: 30,
    y: 72,
    age: "51 anos",
    fear: "ser ouvido",
    secret: "viu a noite da partida",
    role: "testemunha",
  },
] as const;

const EDGES: { from: string; to: string; tone: string; label: string }[] = [
  { from: "ela", to: "ele", tone: "amor", label: "interesse" },
  { from: "ela", to: "irma", tone: "familia", label: "família" },
  { from: "ela", to: "vizinho", tone: "segredo", label: "segredo" },
  { from: "ele", to: "vizinho", tone: "conflito", label: "desconfiança" },
];

export function Landing({ onEnter, local = false }: Props) {
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const [flowStep, setFlowStep] = useState(0);
  const [chapterId, setChapterId] = useState<string>("casa");
  const [focusPerson, setFocusPerson] = useState<string>("ela");
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "16%"]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.14]);
  const copyY = useTransform(scrollYProgress, [0, 0.6], [0, 48]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0.2]);

  const primary = local ? "Entrar no Inklyst" : "Começar no Inklyst";
  const activeFlow = FLOW[flowStep] ?? FLOW[0];
  const activeChapter = CHAPTERS.find((c) => c.id === chapterId) ?? CHAPTERS[0];
  const activePerson = PEOPLE.find((p) => p.id === focusPerson) ?? PEOPLE[0];
  const personEdges = EDGES.filter(
    (e) => e.from === activePerson.id || e.to === activePerson.id,
  );

  return (
    <div className="lp">
      <div className="lp-grain" aria-hidden />

      <header className="lp-nav">
        <a className="lp-mark" href="#topo" aria-label="Inklyst">
          <img src="/logo.png" alt="" width={36} height={36} draggable={false} />
          <span>Inklyst</span>
        </a>
        <nav className="lp-nav-links" aria-label="Secções">
          <a href="#demo">Demo</a>
          <a href="#escrever">Escrever</a>
          <a href="#mundo">Mundo</a>
          <a href="#ler">Ler</a>
        </nav>
        <button
          type="button"
          className="lp-nav-cta"
          onClick={() => onEnter(local ? "up" : "in")}
        >
          Entrar
          <ArrowUpRight size={16} strokeWidth={1.75} />
        </button>
      </header>

      <section ref={heroRef} className="lp-hero" id="topo" aria-label="Inklyst">
        <motion.div
          className="lp-hero-media"
          style={reduce ? undefined : { y: imageY, scale: imageScale }}
        >
          <img src="/landing-hero.jpg" alt="" draggable={false} />
          <div className="lp-hero-shade" aria-hidden />
          <div className="lp-hero-glow" aria-hidden />
        </motion.div>

        <motion.div
          className="lp-hero-copy"
          style={reduce ? undefined : { opacity: copyOpacity, y: copyY }}
          initial={reduce ? false : { opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="lp-brand">
            Inklyst
            <motion.span
              className="lp-brand-rule"
              aria-hidden
              initial={reduce ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.45, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </p>
          <h1>Where stories live.</h1>
          <p className="lp-lead">
            Imaginar, escrever, publicar, descobrir e ler — Reader e Studio na mesma conta, sem
            escolher um rótulo para sempre.
          </p>
          <div className="lp-cta">
            <button type="button" className="lp-btn primary" onClick={() => onEnter("up")}>
              {primary}
              <ArrowRight size={18} />
            </button>
            {!local ? (
              <button type="button" className="lp-btn ghost" onClick={() => onEnter("in")}>
                Já tenho conta
              </button>
            ) : null}
          </div>
        </motion.div>

        <motion.p
          className="lp-scroll-cue"
          aria-hidden
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 0.65 }}
          transition={{ delay: 1.1, duration: 0.8 }}
        >
          Desce o manuscrito
        </motion.p>
      </section>

      <div className="lp-marquee" aria-hidden>
        <div className="lp-marquee-track">
          {[...CRAFT, ...CRAFT].map((word, i) => (
            <span key={`${word}-${i}`}>
              {word}
              <i>·</i>
            </span>
          ))}
        </div>
      </div>

      <section className="lp-quote" aria-label="Sobre escrever">
        <motion.blockquote
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        >
          <p>
            «Às vezes escrevo não para dizer algo novo, mas para não esquecer o que já descobri
            em silêncio.»
          </p>
          <footer>O Inklyst guarda esse silêncio — e o que vem a seguir.</footer>
        </motion.blockquote>
      </section>

      <section className="lp-demo-section" id="demo">
        <motion.div
          className="lp-demo-intro"
          initial={reduce ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-8%" }}
          transition={{ duration: 0.65 }}
        >
          <p className="lp-kicker">Demo</p>
          <h2>Entra no estúdio sem criar conta.</h2>
          <p>
            É o Write a sério — os mesmos ecrãs, o mesmo manuscrito de exemplo. Escreve uma frase,
            muda de capítulo, abre o Mundo. Nada disto grava na tua estante.
          </p>
        </motion.div>
        <WriteDemo />
      </section>

      <section className="lp-split escrever" id="escrever">
        <motion.div
          className="lp-band-copy"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-12%" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="lp-kicker">01 — Escrever</p>
          <h2>Capítulos, cenas e o ritmo de quem volta todos os dias.</h2>
          <p>
            Um estúdio quieto: actos, lixo, versões e exportação — sem parecer uma ferramenta de
            escritório.
          </p>
          <ul className="lp-points">
            <li>Actos e cenas que podes reordenar sem perder o fio</li>
            <li>Versões automáticas enquanto escreves</li>
            <li>PDF, EPUB, DOCX e Markdown quando fores entregar</li>
          </ul>
          <p className="lp-inline-hint">Experimenta mudar de capítulo no painel →</p>
        </motion.div>

        <motion.div
          className="lp-stage"
          initial={reduce ? false : { opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          <figure className="lp-stage-photo" aria-hidden>
            <img src="/banner.jpg" alt="" />
          </figure>
          <div className="lp-stage-chrome" aria-label="Pré-visualização do estúdio">
            <aside className="lp-stage-rail">
              <p className="lp-stage-acto">Acto · A casa</p>
              {CHAPTERS.map((chapter) => (
                <button
                  key={chapter.id}
                  type="button"
                  className={chapter.id === activeChapter.id ? "on" : undefined}
                  onClick={() => setChapterId(chapter.id)}
                >
                  <span>
                    {chapter.index} · {chapter.title}
                  </span>
                  <small>{chapter.words} pal.</small>
                </button>
              ))}
            </aside>
            <div className="lp-stage-page">
              <div className="lp-stage-meta">
                <span>Capítulo {activeChapter.index}</span>
                <span className={`lp-status ${activeChapter.status}`}>{activeChapter.status}</span>
                <span>{activeChapter.words} palavras</span>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeChapter.id}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.28 }}
                >
                  <h3>{activeChapter.title}</h3>
                  <p className="lp-stage-scene">Cena · {activeChapter.scene}</p>
                  <p>{activeChapter.body}</p>
                  <p className="lp-stage-cursor" aria-hidden>
                    |
                  </p>
                </motion.div>
              </AnimatePresence>
              <div className="lp-stage-foot">
                <span>autosave há 2s</span>
                <span>Casa vazia</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="lp-split mundo" id="mundo">
        <motion.div
          className="lp-band-copy"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-12%" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="lp-kicker">02 — Mundo</p>
          <h2>Continuidade que acompanha o texto.</h2>
          <p>
            Bíblia, cronologia, relações e o que cada personagem sabe — para não perderes a idade
            nem o segredo a meio do romance.
          </p>
          <ul className="lp-points">
            <li>Fichas com idade, medo, objectivo e segredo</li>
            <li>Grafo de relações com tipos e arestas estáveis</li>
            <li>Avisos quando a cronologia e o manuscrito não batem certo</li>
          </ul>
          <ul className="lp-tone-legend" aria-label="Tipos de relação">
            <li><i className="tone-amor" /> Amor</li>
            <li><i className="tone-familia" /> Família</li>
            <li><i className="tone-segredo" /> Segredo</li>
            <li><i className="tone-conflito" /> Conflito</li>
          </ul>
        </motion.div>

        <motion.div
          className="lp-mundo-panel"
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="lp-mundo-photo" aria-hidden>
            <img src="/landing-world.jpg" alt="" />
            <div className="lp-mundo-veil" />
          </div>

          <div className="lp-graph" aria-label="Mapa de relações interactivo">
            <svg viewBox="0 0 100 100" className="lp-graph-svg" preserveAspectRatio="none" aria-hidden>
              {EDGES.map((edge) => {
                const a = PEOPLE.find((p) => p.id === edge.from)!;
                const b = PEOPLE.find((p) => p.id === edge.to)!;
                const active = edge.from === focusPerson || edge.to === focusPerson;
                const mx = (a.x + b.x) / 2;
                const my = (a.y + b.y) / 2 - 6;
                return (
                  <g key={`${edge.from}-${edge.to}`} className={active ? "on" : undefined}>
                    <path
                      d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
                      className={`lp-graph-edge tone-${edge.tone}${active ? " on" : ""}`}
                      fill="none"
                    />
                  </g>
                );
              })}
            </svg>
            {PEOPLE.map((person) => (
              <button
                key={person.id}
                type="button"
                className={person.id === focusPerson ? "lp-graph-node on" : "lp-graph-node"}
                style={{ left: `${person.x}%`, top: `${person.y}%` }}
                onClick={() => setFocusPerson(person.id)}
              >
                {person.name}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.aside
              key={activePerson.id}
              className="lp-ficha float"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.28 }}
            >
              <p className="lp-ficha-kicker">
                Ficha · {activePerson.name}
                <span>{activePerson.role}</span>
              </p>
              <p className="lp-ficha-body">
                {activePerson.age} · medo: {activePerson.fear}
              </p>
              <p className="lp-ficha-secret">Segredo · {activePerson.secret}</p>
              <ul className="lp-ficha-edges">
                {personEdges.map((edge) => {
                  const otherId = edge.from === activePerson.id ? edge.to : edge.from;
                  const other = PEOPLE.find((p) => p.id === otherId);
                  return (
                    <li key={`${edge.from}-${edge.to}`}>
                      <span className={`tone tone-${edge.tone}`} />
                      {activePerson.name} · {edge.label} · {other?.name}
                    </li>
                  );
                })}
              </ul>
              <p className="lp-age-warn">
                Em 2019 deveria ter ~29 anos — a ficha diz {activePerson.age}.
              </p>
            </motion.aside>
          </AnimatePresence>
          <p className="lp-graph-hint">Clica numa pessoa</p>
        </motion.div>
      </section>

      <section className="lp-flow" id="fluxo">
        <div className="lp-flow-layout">
          <motion.div
            className="lp-flow-head"
            initial={reduce ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65 }}
          >
            <p className="lp-kicker">O fio</p>
            <h2>Do primeiro rascunho ao leitor.</h2>
            <p>Três gestos. Um sítio. Sem mudar de ferramenta a meio da história.</p>
          </motion.div>

          <div className="lp-flow-board">
            <div className="lp-flow-rail" role="tablist" aria-label="Passos do fio">
              <div className="lp-flow-line" aria-hidden>
                <i style={{ width: `${((flowStep + 1) / FLOW.length) * 100}%` }} />
              </div>
              {FLOW.map((step, index) => (
                <button
                  key={step.n}
                  type="button"
                  role="tab"
                  aria-selected={flowStep === index}
                  className={flowStep === index ? "lp-flow-tab on" : "lp-flow-tab"}
                  onClick={() => setFlowStep(index)}
                  onMouseEnter={() => setFlowStep(index)}
                >
                  <span className="lp-flow-n">{step.n}</span>
                  <strong>{step.t}</strong>
                  <small>{step.d}</small>
                </button>
              ))}
            </div>

            <motion.article
              key={activeFlow.n}
              className="lp-flow-stage"
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <p className="lp-kicker">{activeFlow.n} · {activeFlow.t}</p>
              <h3>{activeFlow.detail}</h3>
              <div className="lp-flow-sample">
                <span>Exemplo</span>
                <p>{activeFlow.sample}</p>
              </div>
              <a className="lp-btn ghost" href="#demo">
                Ver na demo
                <ArrowRight size={16} />
              </a>
            </motion.article>
          </div>
        </div>
      </section>

      <section className="lp-split ler" id="ler">
        <motion.div
          className="lp-band-copy"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-12%" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="lp-kicker">03 — Ler</p>
          <h2>Do manuscrito ao leitor, sem mudar de casa.</h2>
          <p>
            Publica na estante ou abre uma inbox beta. A mesma edição que escreveste — limpa, para
            ser lida.
          </p>
          <ul className="lp-points">
            <li>Pré-visualização no write e abertura na app Ler</li>
            <li>Códigos beta para quem lê antes do mundo</li>
            <li>Uma conta para escrever e ler</li>
          </ul>
          <button type="button" className="lp-btn primary" onClick={() => onEnter("up")}>
            {primary}
            <ArrowRight size={18} />
          </button>
        </motion.div>

        <motion.div
          className="lp-read-stack"
          initial={reduce ? false : { opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <figure className="lp-read-photo">
            <img src="/landing-read.jpg" alt="Livro aberto nas mãos" />
          </figure>
          <article className="lp-reader">
            <header>
              <span>Casa vazia</span>
              <code>WIND-AB12</code>
            </header>
            <p className="lp-reader-kicker">Capítulo 01</p>
            <h3>A cozinha</h3>
            <p>
              A chávena ainda está quente. Ela pousou a mão no bordo e não bebeu. Lá fora, a rua
              fazia o barulho de sempre — e isso era o problema.
            </p>
            <footer>
              <span>Edição beta</span>
              <span>Inklyst Ler</span>
            </footer>
          </article>
        </motion.div>
      </section>

      <section className="lp-close">
        <motion.div
          className="lp-close-inner"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.75 }}
        >
          <p className="lp-brand small">Inklyst</p>
          <h2>O livro merece um sítio com memória.</h2>
          <p>Entra. Escreve a primeira cena. O resto fica à espera — no sítio certo.</p>
          <div className="lp-cta">
            <button type="button" className="lp-btn primary" onClick={() => onEnter("up")}>
              {primary}
              <ArrowRight size={18} />
            </button>
            {!local ? (
              <button type="button" className="lp-btn ghost" onClick={() => onEnter("in")}>
                Já tenho conta
              </button>
            ) : null}
          </div>
        </motion.div>
      </section>

      <footer className="lp-foot">
        <div>
          <p className="lp-foot-brand">Inklyst</p>
          <p>Escrever e ler no mesmo fio.</p>
        </div>
        <nav className="lp-foot-nav" aria-label="Rodapé">
          <a href="#escrever">Escrever</a>
          <a href="#mundo">Mundo</a>
          <a href="#ler">Ler</a>
        </nav>
      </footer>
    </div>
  );
}
