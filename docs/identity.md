# Freebox — Visual Identity & Voice

Last updated: pre-MVP, foundation phase

This document defines the interface design system, design tokens, typography, visual principles, and copywriting guidelines for Freebox. Any user-facing element, copy, or UI component must strictly follow these rules.

---

## Design References (Inspirações)

A estética do Freebox é pautada por três pilares de design:

1. **Dieter Rams / Braun (Precisão e Função):** O design deve ser honesto, útil, minimalista ao extremo e duradouro. A forma segue a função de forma cirúrgica. Cada elemento na tela deve ter um propósito claro; se não tiver, deve ser removido.
2. **Things 3 (Clareza Sem Frieza):** Espaçamento generoso, contrastes suaves, bordas finas e cantos levemente arredondados. A interface deve passar uma sensação de calma, organização e leveza, evitando o visual sobrecarregado comum em aplicativos de treino.
3. **Linear (Produto Técnico de Bom Gosto):** Foco na eficiência e no desenvolvedor/entusiasta técnico. Elementos de UI precisos, feedback tátil limpo e respeito à tipografia.

*O que o Freebox **NÃO** é: Nike Training Club (energia/gritaria), Fitbod (gamificação/3D pesado) ou Strava (redes sociais/competição).*

---

## Design Tokens & Palette (Paleta de Cores e Estilos)

O Freebox adota uma paleta neutra e quente, que remete a papel físico de alta gramatura ou a interfaces industriais clássicas.

```
Base Neutra Quente:  [#F9F6F0] (Creme/Papiro)
Texto Principal:     [#1A1A1A] (Preto Suave)
Texto Secundário:    [#706E6B] (Cinza Quente)
Bordas / Linhas:     [#E5E2DC] (Cinza Claro)
Acento Profundo:     [#0F5A60] (Teal Profundo / Petrol)
Acento Suave (BG):   [#EBF2F3] (Teal Claro para badges)
```

### Regras de Cores:
* **Sem Gradientes:** Cores são sólidas e planas.
* **Sem Tons Neon:** Sem verde limão, vermelho berrante ou azul cobalto comuns em apps fitness.
* **Sombras Limitadas:** Não há sombras projetadas (drop-shadows) estéticas. Sombras são usadas exclusivamente para anéis de foco funcional (foco de input ou botões ativos).
* **Bordas:** Finas e sólidas (1px) em `#E5E2DC` ou `#D0CFC9`.

---

## Typography (Tipografia)

* **Fontes Recomendadas:** Famílias sem-serifa limpas e técnicas (ex: *Inter*, *Outfit*, *Roboto*, ou a padrão do sistema como *San Francisco* no iOS/macOS).
* **Regra Inegociável de Pesos:** Apenas dois pesos de fonte são permitidos em todo o aplicativo:
  * **400 (Regular / Book):** Para corpo de texto, descrições e dados secundários.
  * **500 (Medium):** Para títulos, cabeçalhos de seções e botões.
  * *Nunca usar 600 (Semibold), 700 (Bold) ou superiores.*
* **Formatting Rules:**
  * **Sentence case em tudo:** Títulos de seções, botões e labels de tabelas usam apenas a primeira letra da frase em maiúscula. Nunca usar *Title Case* ("Back Squat (High Bar)" $\rightarrow$ incorreto) nem *ALL CAPS* ("FORÇA" $\rightarrow$ incorreto).
  * **Correto:** "Back squat (high bar)", "Total exercises", "Monday lower", "Start session".

---

## Voice and Copywriting (Guia de Tom e Voz)

O Freebox fala como um assistente de laboratório ou um coach de elite silencioso: direto, sóbrio, preciso, educativo e confiante. É o oposto direto de discursos motivacionais corporativos.

| O que o Freebox diz (Sóbrio/Científico) | O que o Freebox NUNCA diz (Motivacional/Clichê) |
| :--- | :--- |
| "Week 2 of strength. Lower body. Given your check-in, we keep intensity but cut one set per exercise." | "You crushed it! Great job today, athlete! 💪" |
| "Reps of 3–5 activate neural adaptation today. You get stronger without necessarily growing — by design." | "Keep your 15-day streak alive! Don't miss a day!" |
| "Cycle 1 complete. Average deadlift load up 8% versus week 1. Next cycle starts Monday." | "Unlock the Gold Badge of Strength! Share with friends!" |

### Regras de Redação:
1. **Sem exclamações:** Exclamações (!) são proibidas em qualquer parte da interface ou nos retornos do LLM.
2. **Sem emojis:** Nenhum emoji deve ser usado em textos de produto, logs ou feedbacks de treino.
3. **Sem termos motivacionais:** Nada de "parabéns", "você é um guerreiro", "esmagando metas".
4. **Foco no "Porquê":** Cada recomendação é acompanhada por uma justificativa de uma linha explicando o benefício científico ou fisiológico daquela ação (ex: *"3x5 today because we are in strength: low volume, high neural demand"*).

---

## Component Guidelines (Diretrizes de Componentes)

Quando Claude Code ou qualquer desenvolvedor estiver gerando componentes de UI, deve estruturá-los da seguinte forma:

### 1. Cards (Cartões)
* Fundo sólido `#FFFFFF`.
* Borda fina de 1px `#E5E2DC`.
* Canto arredondado discreto (`border-radius: 6px` ou `8px`).
* Sem sombra (`box-shadow: none`).
* Padding interno generoso para respirar.

### 2. Sliders (Controles de Prontidão)
* Linha do trilho fina em `#E5E2DC`.
* Indicador (thumb) redondo, plano, na cor do acento (`#0F5A60`), sem sombras pesadas.
* Feedback numérico discreto acima ou ao lado, em cinza quente (`#706E6B`).

### 3. Tabelas de Treino
* Linhas divisórias horizontais simples de 1px.
* Cabeçalhos de coluna discretos em cinza quente, peso 400.
* Pílulas de status/fases pequenas com fundo leve (`#EBF2F3`) e texto Teal (`#0F5A60`).
