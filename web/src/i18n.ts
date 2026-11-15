// AI-assisted: Claude (Anthropic). Interface languages. English is the default; Spanish, Portuguese and French cover the
// Explorer mission, the welcome dialog and the navigation. Translations drafted with AI and reviewed by the team.
import { useEffect, useState } from "react";

export type Lang = "en" | "es" | "pt" | "fr";
export const LANGS: { id: Lang; label: string; short: string }[] = [
  { id: "en", label: "English", short: "EN" },
  { id: "es", label: "Español", short: "ES" },
  { id: "pt", label: "Português", short: "PT" },
  { id: "fr", label: "Français", short: "FR" },
];

const KEY = "oasis-paradox-lang";
export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>(() => {
    try { const v = localStorage.getItem(KEY); if (v === "en" || v === "es" || v === "pt" || v === "fr") return v; } catch { /* blocked */ }
    return "en";
  });
  useEffect(() => {
    try { localStorage.setItem(KEY, lang); } catch { /* ignore */ }
    document.documentElement.lang = lang;
  }, [lang]);
  return [lang, setLang];
}

/** Replace {name} placeholders. */
export const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

const en = {
  nav: { verdict: "Verdict", evidence: "Evidence", investigate: "Investigate", map: "Map", why: "Why", method: "Method", sources: "Sources",
    language: "Language", help: "Welcome guide", englishOnly: "The Analyst and Expert levels are shown in English." },
  levels: {
    explorer: { name: "Explorer", who: "School students", promise: "A guided mission with Datron, games and plain words." },
    analyst: { name: "Analyst", who: "University students", promise: "Trend lines, ranges, and honest vs. classic tests." },
    expert: { name: "Expert", who: "Scientists, agronomists, statisticians", promise: "Every test, control, formula and data source." },
  },
  welcome: {
    kicker: "Case file № 001 · Status: open", title: "Welcome, detective.",
    body: "In Ica, Peru, the desert is turning green while the wells run dry. Satellites, models and field wells tell different stories. Your job: find out which changes are real.",
    steps: [["Pick a place", "Farms, desert, Andes or the whole region."], ["Call a witness", "A NASA dataset: greenness, heat, rain, water."], ["Read the verdict", "Honest tests decide whether the change is proven."]],
    choose: "Choose your level", skip: "Skip", step2: "Step 2 of 2", title2: "How deep do you want to go?",
    sub2: "Same evidence, three depths. You can switch any time from the top bar.", startAs: "Start as {name}", back: "Back",
    tag2004: "2004", tagLens: "Inside the lens: 2024", close: "Close",
    says: {
      explorer: "Make your guess first. Then check it against the evidence.",
      analyst: "Read the range, not just the slope. If it crosses zero, it is not proven.",
      expert: "Every rule was fixed before we saw Ica's data. Check the criteria yourself.",
    },
  },
  m: {
    next: "Next", back: "Back", skip: "Skip", fullTool: "Open the full tool", restart: "Restart the mission",
    clues: "Clues", notebook: "Detective notebook", empty: "No clues yet.", proven: "Proven", notProven: "Not proven",
    up: "Going up", down: "Going down", none: "No real change", ai: "AI-generated", datron: "Datron, your SciTeX guide",
    chapter: "Chapter {n} of {total}",
    brief: {
      kicker: "Mission briefing", title: "Mission: The Oasis Paradox",
      datron: "Something strange is happening in Ica, Peru. The desert is turning green, but the wells are running dry. Let's find out what is really going on.",
      task: "Collect 4 clues, answer 3 questions and close the case.", start: "Start the mission",
    },
    c1: {
      title: "The greening desert", ask: "Drag the lens over the desert. The lens shows 2024; around it you see 2004.",
      lens: "Drag the lens", predict: "Is the desert really getting greener?", chart: "Each dot is one year of NASA satellite pictures",
      green: "greener", verdict: "The farms keep getting greener.",
      analogy: "These farms now use about {pools} Olympic swimming pools of water every year.",
      datron: "Twenty years of pictures, one clear answer. That is a solid clue.", clue: "The farms got greener every year (NASA MODIS).",
    },
    c2: {
      title: "The thirsty wells", ask: "Tap the wells on the map to question them.",
      count: "{n} wells questioned · {down} went down", wellDown: "My water went down {m} m per year.", wellUp: "My water went up {m} m per year.",
      all: "Question them all", summary: "Of all {total} wells, {pct}% went down. In the north of the valley, every single one did.",
      analogy: "About {m} m every 10 years: like a two-storey house sinking into the ground.",
      house: "10 years", datron: "The satellites saw the farms. The wells tell us what happens underground.",
      clue: "The water underground is falling (87 field wells).",
    },
    c3: {
      title: "The tricky witness", ask: "Some witnesses repeat themselves. Let's see why that matters.",
      fair: "Fair coins", fairSub: "Every month is new, like flipping a fair coin.",
      sticky: "Sticky coins", stickySub: "Every month copies the last one, like groundwater.",
      run: "Flip 100 times each", shouts: "The quick test shouted “trend!” {n} times out of 100.",
      lesson: "Nothing was really changing in either game. The sticky coins fooled the quick test much more often.",
      real: "Now a real witness: NASA's groundwater model for the region.",
      quick: "The quick test says: “The water is rising!”", honest: "Checked properly:",
      datron: "This witness repeats itself. Repeating is not the same as proving.",
      clue: "Some witnesses repeat themselves and fool quick tests.",
    },
    c4: {
      title: "The cooling oasis", datron: "Two thermometers, one story. Look closely before you answer.", ask: "Two thermometers, opposite stories.",
      air: "Air over the region", fields: "Ground of the watered farms",
      airVal: "warmer by about {a} °C every 10 years", fieldVal: "cooler by about {b} °C every 10 years",
      why: "Why would the farms get cooler while the air gets warmer?",
      opts: ["Watering makes water evaporate, and evaporation cools the ground.", "The farms are in the shade of the Andes.", "The satellite camera is broken."],
      right: "Exactly. Evaporation works like sweat: it cools what it leaves.", wrong: "Not quite. Think of how sweat cools your skin.",
      note: "Detective note: part of the cooling may come from the satellite passing a little earlier in the morning. Compared with the untouched desert, the farms still cool.",
      clue: "One process, opposite trends: watering cools the fields.",
    },
    c5: {
      title: "Case closed", quiz: "Three quick questions",
      qs: [
        { q: "A satellite shows the desert getting greener. What should a detective do first?", o: ["Believe it right away", "Check the evidence over many years", "Ignore it"], a: 1 },
        { q: "A wiggly line goes up and the quick test says “rising!”. What could be wrong?", o: ["Nothing, it is rising", "The witness repeats itself, so the quick test gets fooled", "The line is too short to see"], a: 1 },
        { q: "Why do we need wells if we have satellites?", o: ["We don't", "Satellites see the farms; wells see the water underground", "Wells are prettier"], a: 1 },
      ],
      score: "{n} of 3 right", badge: "Junior Data Detective", badgeSub: "Case № 001 · The Oasis Paradox",
      lessons: ["Look before you believe.", "One clue is not enough.", "Some witnesses repeat themselves and can fool you."],
      datron: "Case closed. You checked the evidence like a real scientist.",
      next: "Ready for harder cases?", analyst: "Try the Analyst level",
    },
  },
};

export type Dict = typeof en;

const es: Dict = {
  nav: { verdict: "Veredicto", evidence: "Evidencia", investigate: "Investigar", map: "Mapa", why: "Por qué", method: "Método", sources: "Fuentes",
    language: "Idioma", help: "Guía de bienvenida", englishOnly: "Los niveles Analista y Experto se muestran en inglés." },
  levels: {
    explorer: { name: "Explorador", who: "Escolares", promise: "Una misión guiada con Datron, juegos y palabras simples." },
    analyst: { name: "Analista", who: "Universitarios", promise: "Líneas de tendencia, rangos y pruebas honestas frente a clásicas." },
    expert: { name: "Experto", who: "Científicos, agrónomos, estadísticos", promise: "Cada prueba, control, fórmula y fuente de datos." },
  },
  welcome: {
    kicker: "Expediente № 001 · Caso abierto", title: "Bienvenido, detective.",
    body: "En Ica, Perú, el desierto se vuelve verde mientras los pozos se secan. Los satélites, los modelos y los pozos cuentan historias distintas. Tu trabajo: descubrir qué cambios son reales.",
    steps: [["Elige un lugar", "Campos, desierto, Andes o toda la región."], ["Llama a un testigo", "Un dato de la NASA: verdor, calor, lluvia, agua."], ["Lee el veredicto", "Pruebas honestas deciden si el cambio está probado."]],
    choose: "Elige tu nivel", skip: "Saltar", step2: "Paso 2 de 2", title2: "¿Qué tan a fondo quieres ir?",
    sub2: "La misma evidencia, tres profundidades. Puedes cambiar cuando quieras desde la barra superior.", startAs: "Empezar como {name}", back: "Atrás",
    tag2004: "2004", tagLens: "Dentro de la lupa: 2024", close: "Cerrar",
    says: {
      explorer: "Primero haz tu apuesta. Luego compárala con la evidencia.",
      analyst: "Lee el rango, no solo la pendiente. Si cruza el cero, no está probado.",
      expert: "Cada regla se fijó antes de ver los datos de Ica. Revisa tú mismo los criterios.",
    },
  },
  m: {
    next: "Siguiente", back: "Atrás", skip: "Saltar", fullTool: "Abrir la herramienta completa", restart: "Reiniciar la misión",
    clues: "Pistas", notebook: "Libreta del detective", empty: "Aún no hay pistas.", proven: "Probado", notProven: "No probado",
    up: "Sube", down: "Baja", none: "No cambia de verdad", ai: "Generado con IA", datron: "Datron, tu guía SciTeX",
    chapter: "Capítulo {n} de {total}",
    brief: {
      kicker: "Instrucciones de la misión", title: "Misión: La Paradoja del Oasis",
      datron: "Algo extraño pasa en Ica, Perú. El desierto se vuelve verde, pero los pozos se están secando. Descubramos qué está pasando de verdad.",
      task: "Reúne 4 pistas, responde 3 preguntas y cierra el caso.", start: "Empezar la misión",
    },
    c1: {
      title: "El desierto que reverdece", ask: "Arrastra la lupa sobre el desierto. La lupa muestra 2024; alrededor ves 2004.",
      lens: "Arrastra la lupa", predict: "¿De verdad el desierto se está volviendo más verde?", chart: "Cada punto es un año de fotos del satélite de la NASA",
      green: "más verde", verdict: "Los campos se vuelven cada vez más verdes.",
      analogy: "Estos campos usan ahora unas {pools} piscinas olímpicas de agua cada año.",
      datron: "Veinte años de fotos, una respuesta clara. Es una pista sólida.", clue: "Los campos se volvieron más verdes cada año (NASA MODIS).",
    },
    c2: {
      title: "Los pozos sedientos", ask: "Toca los pozos del mapa para interrogarlos.",
      count: "{n} pozos interrogados · {down} bajaron", wellDown: "Mi agua bajó {m} m por año.", wellUp: "Mi agua subió {m} m por año.",
      all: "Interrogarlos a todos", summary: "De los {total} pozos, el {pct} % bajó. En el norte del valle, bajaron todos.",
      analogy: "Unos {m} m cada 10 años: como una casa de dos pisos que se hunde en el suelo.",
      house: "10 años", datron: "Los satélites vieron los campos. Los pozos nos cuentan lo que pasa bajo tierra.",
      clue: "El agua subterránea está bajando (87 pozos de campo).",
    },
    c3: {
      title: "El testigo tramposo", ask: "Algunos testigos se repiten. Veamos por qué importa.",
      fair: "Monedas normales", fairSub: "Cada mes es nuevo, como lanzar una moneda normal.",
      sticky: "Monedas pegajosas", stickySub: "Cada mes copia al anterior, como el agua subterránea.",
      run: "Lanzar 100 veces cada una", shouts: "La prueba rápida gritó «¡tendencia!» {n} veces de 100.",
      lesson: "En ninguno de los dos juegos cambiaba nada de verdad. Las monedas pegajosas engañaron mucho más a la prueba rápida.",
      real: "Ahora un testigo real: el modelo de agua subterránea de la NASA para la región.",
      quick: "La prueba rápida dice: «¡El agua está subiendo!»", honest: "Revisado con cuidado:",
      datron: "Este testigo se repite a sí mismo. Repetirse no es lo mismo que probar.",
      clue: "Algunos testigos se repiten y engañan a las pruebas rápidas.",
    },
    c4: {
      title: "El oasis que se enfría", datron: "Dos termómetros, una sola historia. Mira con atención antes de responder.", ask: "Dos termómetros, historias opuestas.",
      air: "El aire de la región", fields: "El suelo de los campos regados",
      airVal: "más cálido, unos {a} °C cada 10 años", fieldVal: "más fresco, unos {b} °C cada 10 años",
      why: "¿Por qué los campos se enfrían mientras el aire se calienta?",
      opts: ["Al regar, el agua se evapora, y la evaporación enfría el suelo.", "Los campos están a la sombra de los Andes.", "La cámara del satélite está rota."],
      right: "Exacto. La evaporación funciona como el sudor: enfría lo que deja.", wrong: "No exactamente. Piensa en cómo el sudor enfría tu piel.",
      note: "Nota del detective: parte del enfriamiento puede venir de que el satélite pasa un poco más temprano. Comparados con el desierto intacto, los campos igual se enfrían.",
      clue: "Un mismo proceso, tendencias opuestas: el riego enfría los campos.",
    },
    c5: {
      title: "Caso cerrado", quiz: "Tres preguntas rápidas",
      qs: [
        { q: "Un satélite muestra que el desierto se vuelve verde. ¿Qué debe hacer primero un detective?", o: ["Creerlo de inmediato", "Revisar la evidencia de muchos años", "Ignorarlo"], a: 1 },
        { q: "Una línea con altibajos sube y la prueba rápida dice «¡sube!». ¿Qué podría estar mal?", o: ["Nada, sí sube", "El testigo se repite, así que la prueba rápida se engaña", "La línea es muy corta"], a: 1 },
        { q: "¿Para qué necesitamos pozos si tenemos satélites?", o: ["No los necesitamos", "Los satélites ven los campos; los pozos ven el agua bajo tierra", "Los pozos son más bonitos"], a: 1 },
      ],
      score: "{n} de 3 correctas", badge: "Detective de Datos Junior", badgeSub: "Caso № 001 · La Paradoja del Oasis",
      lessons: ["Mira antes de creer.", "Una sola pista no basta.", "Algunos testigos se repiten y pueden engañarte."],
      datron: "Caso cerrado. Revisaste la evidencia como una científica o un científico de verdad.",
      next: "¿Listo para casos más difíciles?", analyst: "Prueba el nivel Analista",
    },
  },
};

const pt: Dict = {
  nav: { verdict: "Veredito", evidence: "Evidências", investigate: "Investigar", map: "Mapa", why: "Por quê", method: "Método", sources: "Fontes",
    language: "Idioma", help: "Guia de boas-vindas", englishOnly: "Os níveis Analista e Especialista são mostrados em inglês." },
  levels: {
    explorer: { name: "Explorador", who: "Estudantes escolares", promise: "Uma missão guiada com Datron, jogos e palavras simples." },
    analyst: { name: "Analista", who: "Universitários", promise: "Linhas de tendência, intervalos e testes honestos contra clássicos." },
    expert: { name: "Especialista", who: "Cientistas, agrônomos, estatísticos", promise: "Cada teste, controle, fórmula e fonte de dados." },
  },
  welcome: {
    kicker: "Arquivo do caso № 001 · Caso aberto", title: "Bem-vindo, detetive.",
    body: "Em Ica, no Peru, o deserto fica verde enquanto os poços secam. Satélites, modelos e poços contam histórias diferentes. Sua tarefa: descobrir quais mudanças são reais.",
    steps: [["Escolha um lugar", "Fazendas, deserto, Andes ou toda a região."], ["Chame uma testemunha", "Um dado da NASA: verde, calor, chuva, água."], ["Leia o veredito", "Testes honestos decidem se a mudança está provada."]],
    choose: "Escolha seu nível", skip: "Pular", step2: "Passo 2 de 2", title2: "Até onde você quer ir?",
    sub2: "A mesma evidência, três profundidades. Você pode trocar a qualquer momento na barra superior.", startAs: "Começar como {name}", back: "Voltar",
    tag2004: "2004", tagLens: "Dentro da lupa: 2024", close: "Fechar",
    says: {
      explorer: "Primeiro faça seu palpite. Depois compare com a evidência.",
      analyst: "Leia o intervalo, não só a inclinação. Se cruzar o zero, não está provado.",
      expert: "Cada regra foi fixada antes de vermos os dados de Ica. Confira você mesmo os critérios.",
    },
  },
  m: {
    next: "Próximo", back: "Voltar", skip: "Pular", fullTool: "Abrir a ferramenta completa", restart: "Recomeçar a missão",
    clues: "Pistas", notebook: "Caderno do detetive", empty: "Ainda não há pistas.", proven: "Provado", notProven: "Não provado",
    up: "Subindo", down: "Descendo", none: "Sem mudança real", ai: "Gerado por IA", datron: "Datron, seu guia SciTeX",
    chapter: "Capítulo {n} de {total}",
    brief: {
      kicker: "Instruções da missão", title: "Missão: O Paradoxo do Oásis",
      datron: "Algo estranho está acontecendo em Ica, no Peru. O deserto está ficando verde, mas os poços estão secando. Vamos descobrir o que realmente acontece.",
      task: "Reúna 4 pistas, responda 3 perguntas e feche o caso.", start: "Começar a missão",
    },
    c1: {
      title: "O deserto que fica verde", ask: "Arraste a lupa sobre o deserto. A lupa mostra 2024; ao redor você vê 2004.",
      lens: "Arraste a lupa", predict: "O deserto está mesmo ficando mais verde?", chart: "Cada ponto é um ano de fotos do satélite da NASA",
      green: "mais verde", verdict: "As fazendas ficam cada vez mais verdes.",
      analogy: "Essas fazendas usam hoje cerca de {pools} piscinas olímpicas de água por ano.",
      datron: "Vinte anos de fotos, uma resposta clara. É uma pista sólida.", clue: "As fazendas ficaram mais verdes a cada ano (NASA MODIS).",
    },
    c2: {
      title: "Os poços sedentos", ask: "Toque nos poços do mapa para interrogá-los.",
      count: "{n} poços interrogados · {down} desceram", wellDown: "Minha água desceu {m} m por ano.", wellUp: "Minha água subiu {m} m por ano.",
      all: "Interrogar todos", summary: "De todos os {total} poços, {pct}% desceram. No norte do vale, todos desceram.",
      analogy: "Cerca de {m} m a cada 10 anos: como uma casa de dois andares afundando no chão.",
      house: "10 anos", datron: "Os satélites viram as fazendas. Os poços contam o que acontece debaixo da terra.",
      clue: "A água subterrânea está baixando (87 poços).",
    },
    c3: {
      title: "A testemunha enganosa", ask: "Algumas testemunhas se repetem. Vamos ver por que isso importa.",
      fair: "Moedas normais", fairSub: "Cada mês é novo, como jogar uma moeda normal.",
      sticky: "Moedas grudentas", stickySub: "Cada mês copia o anterior, como a água subterrânea.",
      run: "Jogar 100 vezes cada", shouts: "O teste rápido gritou “tendência!” {n} vezes em 100.",
      lesson: "Nada mudava de verdade em nenhum dos jogos. As moedas grudentas enganaram muito mais o teste rápido.",
      real: "Agora uma testemunha real: o modelo de água subterrânea da NASA para a região.",
      quick: "O teste rápido diz: “A água está subindo!”", honest: "Verificado com cuidado:",
      datron: "Esta testemunha se repete. Repetir não é o mesmo que provar.",
      clue: "Algumas testemunhas se repetem e enganam testes rápidos.",
    },
    c4: {
      title: "O oásis que esfria", datron: "Dois termômetros, uma só história. Olhe com atenção antes de responder.", ask: "Dois termômetros, histórias opostas.",
      air: "O ar da região", fields: "O solo das fazendas irrigadas",
      airVal: "mais quente, cerca de {a} °C a cada 10 anos", fieldVal: "mais fresco, cerca de {b} °C a cada 10 anos",
      why: "Por que as fazendas esfriam enquanto o ar esquenta?",
      opts: ["Ao irrigar, a água evapora, e a evaporação esfria o solo.", "As fazendas ficam à sombra dos Andes.", "A câmera do satélite está quebrada."],
      right: "Exato. A evaporação funciona como o suor: esfria o que deixa.", wrong: "Não exatamente. Pense em como o suor esfria a sua pele.",
      note: "Nota do detetive: parte do resfriamento pode vir do satélite passar um pouco mais cedo. Comparadas com o deserto intocado, as fazendas ainda esfriam.",
      clue: "Um processo, tendências opostas: a irrigação esfria as fazendas.",
    },
    c5: {
      title: "Caso encerrado", quiz: "Três perguntas rápidas",
      qs: [
        { q: "Um satélite mostra o deserto ficando verde. O que um detetive deve fazer primeiro?", o: ["Acreditar na hora", "Verificar a evidência de muitos anos", "Ignorar"], a: 1 },
        { q: "Uma linha com altos e baixos sobe e o teste rápido diz “subindo!”. O que pode estar errado?", o: ["Nada, está subindo", "A testemunha se repete, então o teste rápido se engana", "A linha é curta demais"], a: 1 },
        { q: "Por que precisamos de poços se temos satélites?", o: ["Não precisamos", "Satélites veem as fazendas; poços veem a água debaixo da terra", "Poços são mais bonitos"], a: 1 },
      ],
      score: "{n} de 3 certas", badge: "Detetive de Dados Júnior", badgeSub: "Caso № 001 · O Paradoxo do Oásis",
      lessons: ["Olhe antes de acreditar.", "Uma pista só não basta.", "Algumas testemunhas se repetem e podem enganar você."],
      datron: "Caso encerrado. Você verificou a evidência como um cientista de verdade.",
      next: "Pronto para casos mais difíceis?", analyst: "Experimente o nível Analista",
    },
  },
};

const fr: Dict = {
  nav: { verdict: "Verdict", evidence: "Indices", investigate: "Enquêter", map: "Carte", why: "Pourquoi", method: "Méthode", sources: "Sources",
    language: "Langue", help: "Guide d'accueil", englishOnly: "Les niveaux Analyste et Expert sont affichés en anglais." },
  levels: {
    explorer: { name: "Explorateur", who: "Élèves", promise: "Une mission guidée avec Datron, des jeux et des mots simples." },
    analyst: { name: "Analyste", who: "Étudiants", promise: "Courbes de tendance, intervalles, tests honnêtes contre tests classiques." },
    expert: { name: "Expert", who: "Scientifiques, agronomes, statisticiens", promise: "Chaque test, contrôle, formule et source de données." },
  },
  welcome: {
    kicker: "Dossier № 001 · Affaire ouverte", title: "Bienvenue, détective.",
    body: "À Ica, au Pérou, le désert verdit pendant que les puits s'assèchent. Satellites, modèles et puits racontent des histoires différentes. Ta mission : découvrir quels changements sont réels.",
    steps: [["Choisis un lieu", "Champs, désert, Andes ou toute la région."], ["Appelle un témoin", "Une donnée de la NASA : verdure, chaleur, pluie, eau."], ["Lis le verdict", "Des tests honnêtes décident si le changement est prouvé."]],
    choose: "Choisis ton niveau", skip: "Passer", step2: "Étape 2 sur 2", title2: "Jusqu'où veux-tu aller ?",
    sub2: "Les mêmes preuves, trois niveaux de détail. Tu peux changer à tout moment depuis la barre du haut.", startAs: "Commencer comme {name}", back: "Retour",
    tag2004: "2004", tagLens: "Dans la loupe : 2024", close: "Fermer",
    says: {
      explorer: "Fais d'abord ton pari. Puis compare-le avec les preuves.",
      analyst: "Lis l'intervalle, pas seulement la pente. S'il croise zéro, ce n'est pas prouvé.",
      expert: "Chaque règle a été fixée avant de voir les données d'Ica. Vérifie toi-même les critères.",
    },
  },
  m: {
    next: "Suivant", back: "Retour", skip: "Passer", fullTool: "Ouvrir l'outil complet", restart: "Recommencer la mission",
    clues: "Indices", notebook: "Carnet du détective", empty: "Pas encore d'indices.", proven: "Prouvé", notProven: "Non prouvé",
    up: "Ça monte", down: "Ça descend", none: "Pas de vrai changement", ai: "Généré par IA", datron: "Datron, ton guide SciTeX",
    chapter: "Chapitre {n} sur {total}",
    brief: {
      kicker: "Briefing de mission", title: "Mission : le paradoxe de l'oasis",
      datron: "Il se passe quelque chose d'étrange à Ica, au Pérou. Le désert verdit, mais les puits s'assèchent. Découvrons ce qui se passe vraiment.",
      task: "Rassemble 4 indices, réponds à 3 questions et clos l'affaire.", start: "Commencer la mission",
    },
    c1: {
      title: "Le désert qui verdit", ask: "Fais glisser la loupe sur le désert. La loupe montre 2024 ; autour, tu vois 2004.",
      lens: "Fais glisser la loupe", predict: "Le désert devient-il vraiment plus vert ?", chart: "Chaque point est une année de photos du satellite de la NASA",
      green: "plus vert", verdict: "Les champs deviennent de plus en plus verts.",
      analogy: "Ces champs utilisent aujourd'hui environ {pools} piscines olympiques d'eau par an.",
      datron: "Vingt ans de photos, une réponse claire. C'est un indice solide.", clue: "Les champs ont verdi chaque année (NASA MODIS).",
    },
    c2: {
      title: "Les puits assoiffés", ask: "Touche les puits sur la carte pour les interroger.",
      count: "{n} puits interrogés · {down} ont baissé", wellDown: "Mon eau a baissé de {m} m par an.", wellUp: "Mon eau a monté de {m} m par an.",
      all: "Les interroger tous", summary: "Sur les {total} puits, {pct} % ont baissé. Dans le nord de la vallée, tous ont baissé.",
      analogy: "Environ {m} m tous les 10 ans : comme une maison à deux étages qui s'enfonce dans le sol.",
      house: "10 ans", datron: "Les satellites ont vu les champs. Les puits racontent ce qui se passe sous terre.",
      clue: "L'eau souterraine baisse (87 puits de terrain).",
    },
    c3: {
      title: "Le témoin trompeur", ask: "Certains témoins se répètent. Voyons pourquoi c'est important.",
      fair: "Pièces normales", fairSub: "Chaque mois est nouveau, comme lancer une pièce normale.",
      sticky: "Pièces collantes", stickySub: "Chaque mois copie le précédent, comme l'eau souterraine.",
      run: "Lancer 100 fois chacune", shouts: "Le test rapide a crié « tendance ! » {n} fois sur 100.",
      lesson: "Rien ne changeait vraiment dans aucun des deux jeux. Les pièces collantes ont bien plus souvent trompé le test rapide.",
      real: "Maintenant un vrai témoin : le modèle d'eau souterraine de la NASA pour la région.",
      quick: "Le test rapide dit : « L'eau monte ! »", honest: "Vérifié avec soin :",
      datron: "Ce témoin se répète. Se répéter, ce n'est pas prouver.",
      clue: "Certains témoins se répètent et trompent les tests rapides.",
    },
    c4: {
      title: "L'oasis qui se rafraîchit", datron: "Deux thermomètres, une seule histoire. Regarde bien avant de répondre.", ask: "Deux thermomètres, deux histoires opposées.",
      air: "L'air de la région", fields: "Le sol des champs irrigués",
      airVal: "plus chaud d'environ {a} °C tous les 10 ans", fieldVal: "plus frais d'environ {b} °C tous les 10 ans",
      why: "Pourquoi les champs se rafraîchissent-ils pendant que l'air se réchauffe ?",
      opts: ["L'arrosage fait évaporer l'eau, et l'évaporation rafraîchit le sol.", "Les champs sont à l'ombre des Andes.", "La caméra du satellite est cassée."],
      right: "Exactement. L'évaporation agit comme la sueur : elle rafraîchit ce qu'elle quitte.", wrong: "Pas tout à fait. Pense à la façon dont la sueur rafraîchit ta peau.",
      note: "Note du détective : une partie du refroidissement peut venir du satellite qui passe un peu plus tôt. Comparés au désert intact, les champs se rafraîchissent quand même.",
      clue: "Un même processus, des tendances opposées : l'irrigation rafraîchit les champs.",
    },
    c5: {
      title: "Affaire classée", quiz: "Trois questions rapides",
      qs: [
        { q: "Un satellite montre le désert qui verdit. Que doit faire un détective d'abord ?", o: ["Le croire tout de suite", "Vérifier les preuves sur de nombreuses années", "L'ignorer"], a: 1 },
        { q: "Une courbe en zigzag monte et le test rapide dit « ça monte ! ». Qu'est-ce qui pourrait clocher ?", o: ["Rien, ça monte", "Le témoin se répète, donc le test rapide se trompe", "La courbe est trop courte"], a: 1 },
        { q: "Pourquoi avons-nous besoin de puits si nous avons des satellites ?", o: ["On n'en a pas besoin", "Les satellites voient les champs ; les puits voient l'eau sous terre", "Les puits sont plus jolis"], a: 1 },
      ],
      score: "{n} sur 3 correctes", badge: "Détective des données junior", badgeSub: "Affaire № 001 · Le paradoxe de l'oasis",
      lessons: ["Regarde avant de croire.", "Un seul indice ne suffit pas.", "Certains témoins se répètent et peuvent te tromper."],
      datron: "Affaire classée. Tu as vérifié les preuves comme un vrai scientifique.",
      next: "Prêt pour des affaires plus difficiles ?", analyst: "Essaie le niveau Analyste",
    },
  },
};

export const DICTS: Record<Lang, Dict> = { en, es, pt, fr };
export const NUM_LOCALE: Record<Lang, string> = { en: "en-US", es: "es-PE", pt: "pt-BR", fr: "fr-FR" };
