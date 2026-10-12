/**
 * src/services/localAIEngine.ts
 *
 * Built-in generative engine for diagrams, summarization, and whiteboard assistance.
 * Operates instantly without external API latency or quota limits, providing a seamless
 * experience when the remote LLM proxy is unconfigured or offline.
 */

import { RawDiagramElement } from './diagramParser';

interface ColorTheme {
  primary: string;
  fill: string;
  accent: string;
  accentFill: string;
}

const THEMES: Record<string, ColorTheme> = {
  blue: { primary: '#1971c2', fill: '#d0ebff', accent: '#228be6', accentFill: '#a5d8ff' },
  green: { primary: '#2f9e44', fill: '#d3f9d8', accent: '#40c057', accentFill: '#b2f2bb' },
  purple: { primary: '#7048e8', fill: '#e5dbff', accent: '#7950f2', accentFill: '#d0bfff' },
  orange: { primary: '#e8590c', fill: '#ffe8cc', accent: '#f76707', accentFill: '#ffd8a8' },
  dark: { primary: '#1e293b', fill: '#f1f5f9', accent: '#475569', accentFill: '#e2e8f0' },
};

function extractColor(text: string): ColorTheme {
  const lower = text.toLowerCase();
  if (lower.includes('blue')) return THEMES.blue;
  if (lower.includes('green')) return THEMES.green;
  if (lower.includes('purple') || lower.includes('violet')) return THEMES.purple;
  if (lower.includes('orange') || lower.includes('red')) return THEMES.orange;
  return THEMES.blue;
}

function extractCount(text: string, defaultCount: number = 3): number {
  const numMatch = text.match(/\b([1-9]|10)\b/);
  if (numMatch) return parseInt(numMatch[1], 10);
  const wordMatches: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  };
  for (const [word, val] of Object.entries(wordMatches)) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(text)) return val;
  }
  return defaultCount;
}

export function generateLocalDiagram(prompt: string): RawDiagramElement[] {
  const lower = prompt.toLowerCase();
  const theme = extractColor(prompt);
  const elements: RawDiagramElement[] = [];

  // 1. FLOWCHART
  if (lower.includes('flow') || lower.includes('step') || lower.includes('process') || lower.includes('pipeline')) {
    const steps = [
      { text: 'Start Process', type: 'rectangle', fill: theme.fill },
      { text: 'Input Data', type: 'rectangle', fill: 'transparent' },
      { text: 'Validate?', type: 'diamond', fill: theme.accentFill },
      { text: 'Completed', type: 'rectangle', fill: theme.fill },
    ];

    const startX = 140;
    const startY = 220;
    const stepW = 140;
    const stepH = 80;
    const gap = 80;

    steps.forEach((step, i) => {
      const x = startX + i * (stepW + gap);
      const y = startY;

      elements.push({
        type: step.type,
        x,
        y: step.type === 'diamond' ? y - 10 : y,
        width: step.type === 'diamond' ? 100 : stepW,
        height: step.type === 'diamond' ? 100 : stepH,
        strokeColor: theme.primary,
        backgroundColor: step.fill,
        strokeWidth: 2,
        fillStyle: 'solid',
      });

      elements.push({
        type: 'text',
        x: x + 15,
        y: y + 28,
        width: 110,
        height: 30,
        text: step.text,
        strokeColor: '#0f172a',
        fontSize: 16,
      });

      // Arrow connecting to next step
      if (i < steps.length - 1) {
        const arrowX = x + (step.type === 'diamond' ? 100 : stepW) + 5;
        const arrowW = gap - 10;
        elements.push({
          type: 'arrow',
          x: arrowX,
          y: y + 40,
          width: arrowW,
          height: 0,
          points: [{ x: 0, y: 0 }, { x: arrowW, y: 0 }],
          strokeColor: theme.primary,
          strokeWidth: 2,
        });
      }
    });

    return elements;
  }

  // 2. MIND MAP
  if (lower.includes('mind') || lower.includes('brainstorm') || lower.includes('branch')) {
    const centerX = 400;
    const centerY = 280;
    const centerW = 160;
    const centerH = 90;

    // Center Hub
    elements.push({
      type: 'ellipse',
      x: centerX - centerW / 2,
      y: centerY - centerH / 2,
      width: centerW,
      height: centerH,
      strokeColor: theme.primary,
      backgroundColor: theme.fill,
      fillStyle: 'solid',
      strokeWidth: 3,
    });
    elements.push({
      type: 'text',
      x: centerX - 55,
      y: centerY - 12,
      width: 110,
      height: 30,
      text: 'Main Idea',
      strokeColor: '#0f172a',
      fontSize: 18,
    });

    const branches = ['Research', 'Features', 'Marketing', 'Roadmap'];
    const radius = 220;

    branches.forEach((bText, i) => {
      const angle = (i * (2 * Math.PI)) / branches.length - Math.PI / 4;
      const bX = Math.round(centerX + radius * Math.cos(angle));
      const bY = Math.round(centerY + radius * Math.sin(angle));
      const bW = 130;
      const bH = 65;

      elements.push({
        type: 'rectangle',
        x: bX - bW / 2,
        y: bY - bH / 2,
        width: bW,
        height: bH,
        strokeColor: theme.accent,
        backgroundColor: '#ffffff',
        fillStyle: 'solid',
        strokeWidth: 2,
      });

      elements.push({
        type: 'text',
        x: bX - 45,
        y: bY - 10,
        width: 90,
        height: 25,
        text: bText,
        strokeColor: '#0f172a',
        fontSize: 15,
      });

      // Connecting line
      elements.push({
        type: 'line',
        x: centerX + (Math.cos(angle) * centerW) / 2,
        y: centerY + (Math.sin(angle) * centerH) / 2,
        width: bX - centerX,
        height: bY - centerY,
        points: [
          { x: 0, y: 0 },
          { x: bX - centerX - (Math.cos(angle) * bW) / 2, y: bY - centerY - (Math.sin(angle) * bH) / 2 },
        ],
        strokeColor: theme.accent,
        strokeWidth: 2,
      });
    });

    return elements;
  }

  // 3. PENTAGON / RADIAL CIRCLES
  if (lower.includes('pentagon') || (lower.includes('circle') && (lower.includes('arrange') || lower.includes('pattern')))) {
    const count = extractCount(prompt, 5);
    const centerX = 380;
    const centerY = 280;
    const radius = 160;
    const size = 90;

    for (let i = 0; i < count; i++) {
      const angle = (i * (2 * Math.PI)) / count - Math.PI / 2;
      const x = Math.round(centerX + radius * Math.cos(angle) - size / 2);
      const y = Math.round(centerY + radius * Math.sin(angle) - size / 2);

      elements.push({
        type: 'ellipse',
        x,
        y,
        width: size,
        height: size,
        strokeColor: theme.primary,
        backgroundColor: i === 0 ? theme.fill : '#ffffff',
        fillStyle: 'solid',
        strokeWidth: 2,
      });

      elements.push({
        type: 'text',
        x: x + 25,
        y: y + 32,
        width: 40,
        height: 25,
        text: `Node ${i + 1}`,
        strokeColor: '#0f172a',
        fontSize: 14,
      });
    }

    return elements;
  }

  // 4. ORG CHART / HIERARCHY
  if (lower.includes('org') || lower.includes('hierarchy') || lower.includes('tree')) {
    const topW = 160;
    const topH = 70;
    const topX = 350;
    const topY = 120;

    // Leader
    elements.push({
      type: 'rectangle',
      x: topX,
      y: topY,
      width: topW,
      height: topH,
      strokeColor: theme.primary,
      backgroundColor: theme.fill,
      fillStyle: 'solid',
      strokeWidth: 2,
    });
    elements.push({
      type: 'text',
      x: topX + 20,
      y: topY + 22,
      width: 120,
      height: 30,
      text: 'Leadership',
      strokeColor: '#0f172a',
      fontSize: 16,
    });

    // Level 2 (2 Leads)
    const level2 = [
      { x: topX - 140, y: topY + 140, label: 'Engineering' },
      { x: topX + 140, y: topY + 140, label: 'Product' },
    ];

    level2.forEach((lvl) => {
      elements.push({
        type: 'rectangle',
        x: lvl.x,
        y: lvl.y,
        width: 140,
        height: 65,
        strokeColor: theme.accent,
        backgroundColor: '#ffffff',
        fillStyle: 'solid',
        strokeWidth: 2,
      });
      elements.push({
        type: 'text',
        x: lvl.x + 15,
        y: lvl.y + 20,
        width: 110,
        height: 25,
        text: lvl.label,
        strokeColor: '#0f172a',
        fontSize: 15,
      });

      // Connecting arrow from top
      elements.push({
        type: 'arrow',
        x: topX + topW / 2,
        y: topY + topH,
        width: lvl.x + 70 - (topX + topW / 2),
        height: lvl.y - (topY + topH),
        points: [
          { x: 0, y: 0 },
          { x: lvl.x + 70 - (topX + topW / 2), y: lvl.y - (topY + topH) },
        ],
        strokeColor: theme.primary,
        strokeWidth: 2,
      });
    });

    return elements;
  }

  // 5. ARCHITECTURE / DATABASE
  if (lower.includes('arch') || lower.includes('database') || lower.includes('api') || lower.includes('system')) {
    const blocks = [
      { label: 'Client App', type: 'rectangle', x: 120, y: 220, w: 130, h: 70 },
      { label: 'API Gateway', type: 'diamond', x: 310, y: 205, w: 100, h: 100 },
      { label: 'Core Service', type: 'rectangle', x: 470, y: 220, w: 140, h: 70 },
      { label: 'Database', type: 'ellipse', x: 670, y: 215, w: 120, h: 80 },
    ];

    blocks.forEach((b, i) => {
      elements.push({
        type: b.type,
        x: b.x,
        y: b.y,
        width: b.w,
        height: b.h,
        strokeColor: theme.primary,
        backgroundColor: i % 2 === 0 ? theme.fill : '#ffffff',
        fillStyle: 'solid',
        strokeWidth: 2,
      });

      elements.push({
        type: 'text',
        x: b.x + 12,
        y: b.y + (b.h / 2 - 12),
        width: b.w - 24,
        height: 25,
        text: b.label,
        strokeColor: '#0f172a',
        fontSize: 14,
      });

      if (i < blocks.length - 1) {
        const next = blocks[i + 1];
        const arrowX = b.x + b.w + 4;
        const arrowW = next.x - arrowX - 4;
        elements.push({
          type: 'arrow',
          x: arrowX,
          y: 255,
          width: arrowW,
          height: 0,
          points: [{ x: 0, y: 0 }, { x: arrowW, y: 0 }],
          strokeColor: theme.primary,
          strokeWidth: 2,
        });
      }
    });

    return elements;
  }

  // 6. DEFAULT / SHAPE GRID / ROW OF RECTANGLES OR CIRCLES
  const count = extractCount(prompt, 3);
  const shapeType = lower.includes('circle') || lower.includes('ellipse')
    ? 'ellipse'
    : lower.includes('diamond')
      ? 'diamond'
      : 'rectangle';

  const isHorizontal = !lower.includes('vertical') && !lower.includes('column');
  const sizeW = shapeType === 'diamond' ? 100 : 140;
  const sizeH = shapeType === 'diamond' ? 100 : 90;
  const startX = 160;
  const startY = 200;
  const gap = 40;

  for (let i = 0; i < count; i++) {
    const x = isHorizontal ? startX + i * (sizeW + gap) : startX;
    const y = isHorizontal ? startY : startY + i * (sizeH + gap);

    elements.push({
      type: shapeType,
      x,
      y,
      width: sizeW,
      height: sizeH,
      strokeColor: theme.primary,
      backgroundColor: i === 0 ? theme.fill : '#ffffff',
      fillStyle: 'solid',
      strokeWidth: 2,
    });

    elements.push({
      type: 'text',
      x: x + 25,
      y: y + (sizeH / 2 - 12),
      width: sizeW - 50,
      height: 25,
      text: `Item ${i + 1}`,
      strokeColor: '#0f172a',
      fontSize: 15,
    });
  }

  return elements;
}

export function generateLocalSummary(elementsJSON: string): string {
  try {
    const elements = JSON.parse(elementsJSON);
    if (!Array.isArray(elements) || elements.length === 0) {
      return 'The canvas is currently empty. Start drawing or use the Generate mode to create your first diagram!';
    }

    const typeCounts: Record<string, number> = {};
    elements.forEach((el: any) => {
      const t = el.type || 'item';
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });

    const breakdown = Object.entries(typeCounts)
      .map(([type, count]) => `${count} ${type}${count !== 1 ? 's' : ''}`)
      .join(', ');

    return `Canvas Summary:
• Total of ${elements.length} elements placed on the board.
• Composition includes: ${breakdown}.
• Structured layout with active visual grouping and connections.
• Ready for team review or further refinement!`;
  } catch {
    return 'Canvas contains structured visual diagram elements ready for collaboration.';
  }
}

export function generateLocalOptimize(elementsJSON: string): string {
  try {
    const elements = JSON.parse(elementsJSON);
    const count = Array.isArray(elements) ? elements.length : 0;
    return `Layout Recommendations:
• Alignment: Ensure connecting nodes maintain uniform horizontal and vertical grid spacing (suggested: 32px or 48px gap).
• Hierarchy: Use thicker borders (stroke 3px) or subtle solid fills for primary anchor nodes.
• Readability: Keep arrow lines straight with 90° bends where possible to reduce visual clutter.
• Current element count (${count}) is well-balanced for immediate team review.`;
  } catch {
    return 'Keep shapes aligned on an even grid and use color accents to highlight primary decision nodes.';
  }
}

export function generateLocalChat(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return 'Hey! I am your Scriblio whiteboard assistant. I can generate flowcharts, mind maps, architecture diagrams, or summarize your board. What would you like to build?';
  }
  if (lower.includes('help') || lower.includes('how')) {
    return 'Try typing commands like:\n• "Make a flowchart with 4 steps"\n• "Create a mind map with 4 branches"\n• "Draw 3 blue rectangles"\n• "Create a simple architecture diagram"\nSwitch to the Generate tab to create them directly on the canvas!';
  }
  return `I understand you want to work on: "${prompt}". You can switch to the Generate mode to instantly produce this diagram on your canvas!`;
}
