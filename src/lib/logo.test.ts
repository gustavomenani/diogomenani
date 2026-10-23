import { describe, expect, test } from 'vitest';
import { logoLayouts, logoTones, monogram, wordmark } from '../data/brand';
import { logoPath, logoSvg } from './logo';

describe('logoSvg', () => {
  test('traz o monograma e as duas linhas da assinatura', () => {
    const svg = logoSvg('blue');
    for (const part of [monogram, wordmark.name, wordmark.sub]) {
      expect(svg).toContain(`viewBox="${part.viewBox}"`);
      expect(svg).toContain(part.d);
    }
  });

  test('ocupa o viewBox do logo oficial', () => {
    const { width, height } = logoLayouts.full;
    expect(logoSvg('white')).toContain(`viewBox="0 0 ${width} ${height}"`);
  });

  test('a versão compacta é mais baixa e tem a linha de baixo na largura do nome', () => {
    const { width, height, name, sub } = logoLayouts.compact;
    const svg = logoSvg('white', 'compact');
    expect(svg).toContain(`viewBox="0 0 ${width} ${height}"`);
    expect(height).toBeLessThan(logoLayouts.full.height);
    expect(sub.width).toBe(name.width);
    expect(sub.x).toBe(name.x);
  });

  test('a versão azul tem monograma azul, divisória cinza e texto preto', () => {
    const svg = logoSvg('blue');
    expect(svg).toContain(`<path fill="${logoTones.blue.mark}"`);
    expect(svg).toContain(`stop-color="${logoTones.blue.rule}"`);
    expect(svg).toContain(`<path fill="${logoTones.blue.text}"`);
  });

  test('a versão branca é toda branca', () => {
    const colors = logoSvg('white').match(/(?:fill|stop-color)="#[0-9a-f]+"/g) ?? [];
    expect(colors.length).toBeGreaterThan(0);
    for (const attr of colors) expect(attr).toMatch(/"#fff"$/);
  });

  test('cada peça mantém a proporção do próprio viewBox', () => {
    // 192 de largura no viewBox 768×78 dá 19,5 de altura.
    expect(logoSvg('blue')).toContain('width="192" height="19.5"');
  });
});

describe('logoPath', () => {
  test('a oficial leva só a cor; a compacta, o nome da versão antes', () => {
    expect(logoPath('blue')).toBe('/logo-blue.svg');
    expect(logoPath('white', 'full')).toBe('/logo-white.svg');
    expect(logoPath('white', 'compact')).toBe('/logo-compact-white.svg');
  });
});
