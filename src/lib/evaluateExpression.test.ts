import { describe, it, expect } from 'vitest';
import { evaluateExpression } from './evaluateExpression';

describe('evaluateExpression', () => {
  it('respeita a precedência de * sobre +', () => {
    expect(evaluateExpression('2+3*4')).toBe(14);
  });

  it('respeita parênteses', () => {
    expect(evaluateExpression('(2+3)*4')).toBe(20);
  });

  it('soma decimais', () => {
    expect(evaluateExpression('0.1+0.2')).toBeCloseTo(0.3);
  });

  it('aceita menos unário no início e após operador', () => {
    expect(evaluateExpression('-3*2')).toBe(-6);
    expect(evaluateExpression('2*-3')).toBe(-6);
  });

  it('divide com resultado decimal', () => {
    expect(evaluateExpression('7/2')).toBe(3.5);
  });

  it('subtração é associativa à esquerda', () => {
    expect(evaluateExpression('10-3-2')).toBe(5);
    expect(evaluateExpression('100/10/5')).toBe(2);
  });

  it('rejeita divisão por zero', () => {
    expect(() => evaluateExpression('1/0')).toThrow();
  });

  it('rejeita expressão incompleta', () => {
    expect(() => evaluateExpression('2+')).toThrow();
  });

  it('rejeita parênteses desbalanceados', () => {
    expect(() => evaluateExpression('(2+3')).toThrow();
    expect(() => evaluateExpression('2+3)')).toThrow();
  });

  it('rejeita operador duplicado e token inválido', () => {
    expect(() => evaluateExpression('2**3')).toThrow();
    expect(() => evaluateExpression('2a+1')).toThrow();
  });

  it('rejeita número malformado', () => {
    expect(() => evaluateExpression('1.2.3+1')).toThrow();
  });
});
