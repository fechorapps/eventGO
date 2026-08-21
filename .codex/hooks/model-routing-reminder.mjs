#!/usr/bin/env node

const chunks = [];

for await (const chunk of process.stdin) {
  chunks.push(chunk);
}

let input;

try {
  input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
} catch {
  process.exit(0);
}

const model = String(input.model ?? "").toLowerCase();
const originalPrompt = String(input.prompt ?? "");
const prompt = originalPrompt
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();
const modelConfirmed = prompt.includes("[modelo-confirmado]");
const routingPrompt = prompt.replaceAll("[modelo-confirmado]", "");

if (!prompt) {
  process.exit(0);
}

const criticalPatterns = [
  /\barquitectur\w*/,
  /\badr\b/,
  /\bmigraci\w*/,
  /\bmigrat\w*/,
  /\bbackfill\b/,
  /\bseguridad\b/,
  /\bsecurity\b/,
  /\bvulnerab\w*/,
  /\bauth(?:entication|orization)?\b/,
  /\bautenticaci\w*/,
  /\bautorizaci\w*/,
  /\bpermis\w*/,
  /\brbac\b/,
  /\bpii\b/,
  /\bprivacidad\b/,
  /\bpagos?\b/,
  /\bpayments?\b/,
  /\bbilling\b/,
  /\bcontratos?\b/,
  /\bcotizaci\w*/,
  /\bfinancier\w*/,
  /\bdeploy\w*/,
  /\bproduccion\b/,
  /\brelease\b/,
  /\bpublicar\b/,
  /\bpush\s+(?:a\s+)?main\b/,
  /\bmerge\b/,
  /\bdrop\s+table\b/,
  /\brm\s+-rf\b/,
  /\breset\s+--hard\b/,
  /\beliminar\s+(?:los\s+|las\s+)?datos\b/,
  /\brevision\s+final\b/,
  /\bauditori\w*/
];

const routinePatterns = [
  /\bformate\w*/,
  /\bformat(?:ting)?\b/,
  /\blint\b/,
  /\btypos?\b/,
  /\bortografi\w*/,
  /\btraduc\w*/,
  /\btranslat\w*/,
  /\brenombr\w*/,
  /\brename\b/,
  /\bfixtures?\b/,
  /\bmock\s+data\b/,
  /\bdatos\s+de\s+prueba\b/,
  /\bcrud\s+repetitivo\b/,
  /\bboilerplate\b/,
  /\bclasific\w*/,
  /\bextract\w*/,
  /\bextracci\w*/,
  /\bresumen\s+estructurado\b/,
  /\bcsv\b/
];

const implementationPatterns = [
  /\bimplement\w*/,
  /\brefactor\w*/,
  /\bfix\b/,
  /\bbug\b/,
  /\bapi\b/,
  /\bendpoint\w*/,
  /\bcomponent\w*/,
  /\bprisma\b/,
  /\btests?\b/,
  /\bpruebas?\b/
];

const skillRoutes = [
  {
    patterns: [/\bcodex\b/, /\bopenai\b/, /\bhooks?\b/, /\bmodelo\b/, /\bsuscripci\w*/],
    skills: ["openai-docs"]
  },
  {
    patterns: [/\bseguridad\b/, /\bsecurity\b/, /\bvulnerab\w*/, /\bauth\w*/, /\bautorizaci\w*/, /\bpermis\w*/, /\brbac\b/, /\bpii\b/, /\bprivacidad\b/, /\bpagos?\b/, /\bpayments?\b/, /\bbilling\b/],
    skills: ["security-review"]
  },
  {
    patterns: [/\barquitectur\w*/, /\badr\b/, /\bmigraci\w*/, /\bmigrat\w*/, /\bbackfill\b/],
    skills: ["architecture"]
  },
  {
    patterns: [/\bdominio\b/, /\bdomain\b/, /\bentidad\w*/, /\bentities\b/, /\bagregad\w*/, /\binvariant\w*/],
    skills: ["domain-driven-design"]
  },
  {
    patterns: [/\bdebug\w*/, /\binvestig\w*/, /\bcausa\s+raiz\b/, /\broot\s+cause\b/, /\bpor\s+que\s+falla\b/],
    skills: ["investigate"]
  },
  {
    patterns: [/\bqa\b/, /\be2e\b/, /\bprueba\s+en\s+navegador\b/, /\bbrowser\s+test\b/],
    skills: ["qa", "playwright-cli"]
  },
  {
    patterns: [/\bbenchmark\b/, /\bregresion\s+de\s+rendimiento\b/, /\bperformance\s+regression\b/],
    skills: ["benchmark"]
  },
  {
    patterns: [/\bpdf\b/, /\bmarkdown\s+a\s+pdf\b/],
    skills: ["make-pdf"]
  },
  {
    patterns: [/\bdocumenta\w*/, /\bdocs?\b/, /\breadme\b/],
    skills: ["document-generate"]
  },
  {
    patterns: [/\breview\b/, /\brevision\s+de\s+(?:codigo|cambios|diff)\b/, /\bpre-landing\b/],
    skills: ["review"]
  },
  {
    patterns: [/\bship\b/, /\bdeploy\w*/, /\bpublicar\b/, /\brelease\b/],
    skills: ["ship"]
  },
  {
    patterns: [/\bresearch\b/, /\binvestigacion\s+de\s+producto\b/, /\bcompetidores?\b/, /\bfeature\s+discovery\b/],
    skills: ["design-consultation", "product-designer"]
  },
  {
    patterns: [/\bespecificaci\w*/, /\bspec\b/, /\bplan\s+de\s+implementacion\b/, /\bbacklog\b/],
    skills: ["spec"]
  },
  {
    patterns: [/\bdiseno\s+visual\b/, /\bdisen\w*\s+(?:pantalla|componente|interfaz|layout)\b/, /\bux\b/, /\bui\b/, /\binterfaz\b/, /\bvisual\b/, /\blayout\b/],
    skills: ["frontend-design"]
  },
  {
    patterns: [/\bnext(?:\.js|js)?\b/, /\breact\b/, /\bfrontend\b/, /\bcomponent\w*/],
    skills: ["vercel-react-best-practices"]
  },
  {
    patterns: [/\bvertical\s+slice\b/, /\bfeature\b/, /\bapi\b/, /\bendpoint\w*/, /\bimplement\w*/],
    skills: ["vertical-slice-architecture"]
  }
];

const matchesAny = (patterns) => patterns.some((pattern) => pattern.test(routingPrompt));
const isSol = model.includes("sol") || model === "gpt-5.6";
const isTerra = model.includes("terra");
const isLuna = model.includes("luna");
const isCritical = matchesAny(criticalPatterns);
const isRoutine = !isCritical && matchesAny(routinePatterns);
const isImplementation = !isCritical && !isRoutine && matchesAny(implementationPatterns);

const recommendedSkills = [];

for (const route of skillRoutes) {
  if (!matchesAny(route.patterns)) {
    continue;
  }

  for (const skill of route.skills) {
    if (!recommendedSkills.includes(skill) && recommendedSkills.length < 2) {
      recommendedSkills.push(skill);
    }
  }

  if (recommendedSkills.length >= 2) {
    break;
  }
}

let recommendation;
let reason;

if (!modelConfirmed && isCritical && !isSol) {
  recommendation = "GPT-5.6 Sol con razonamiento High";
  reason = "la tarea parece involucrar una decisión crítica, riesgo de datos, seguridad, finanzas o publicación";
} else if (!modelConfirmed && isRoutine && isSol) {
  recommendation = "GPT-5.6 Luna con razonamiento Low o Medium";
  reason = "la tarea parece clara, mecánica y repetible";
} else if (!modelConfirmed && isRoutine && isTerra) {
  recommendation = "GPT-5.6 Luna con razonamiento Low o Medium";
  reason = "Luna normalmente aprovecha mejor la cuota para este trabajo repetitivo";
} else if (!modelConfirmed && isImplementation && isLuna) {
  recommendation = "GPT-5.6 Terra con razonamiento Medium";
  reason = "la tarea parece implementación de producción y necesita más juicio que una transformación repetitiva";
}

if (!recommendation && recommendedSkills.length === 0) {
  process.exit(0);
}

const activeModel = input.model || "no identificado";
const modelReminder = recommendation
  ? `Modelo activo: ${activeModel}. Considera cambiar a ${recommendation}: ${reason}.`
  : `El modelo activo (${activeModel}) no presenta un desajuste claro para esta tarea.`;
const skillReminder = recommendedSkills.length > 0
  ? `Antes de actuar, carga y sigue ${recommendedSkills.map((skill) => `$${skill}`).join(" y ")}. Usa el conjunto mínimo y anuncia la selección.`
  : "No se detectó una skill específica.";
const reminder = `${modelReminder} ${skillReminder} Este recordatorio no bloquea la tarea. Si la selección actual es deliberada, continúa o usa [modelo-confirmado] en el prompt.`;
const summary = [
  recommendation ? recommendation : null,
  recommendedSkills.length > 0 ? recommendedSkills.map((skill) => `$${skill}`).join(" + ") : null
].filter(Boolean).join(" | ");

process.stdout.write(
  JSON.stringify({
    continue: true,
    systemMessage: `Routing EventGO: ${summary}`,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: reminder
    }
  })
);
