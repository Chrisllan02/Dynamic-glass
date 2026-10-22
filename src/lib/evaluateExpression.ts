type Token = { type: 'num'; value: number } | { type: 'op'; value: string } | { type: 'paren'; value: '(' | ')' };

const PRECEDENCE: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, 'u': 3 };

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expression.length) {
    const ch = expression[i];
    if (ch === ' ') {
      i++;
    } else if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < expression.length && /[0-9.]/.test(expression[j])) j++;
      const raw = expression.slice(i, j);
      if (!/^(\d+\.?\d*|\.\d+)$/.test(raw)) throw new Error('Número inválido');
      tokens.push({ type: 'num', value: Number(raw) });
      i = j;
    } else if ('+-*/'.includes(ch)) {
      const prev = tokens[tokens.length - 1];
      const unary = ch === '-' && (!prev || prev.type === 'op' || (prev.type === 'paren' && prev.value === '('));
      tokens.push({ type: 'op', value: unary ? 'u' : ch });
      i++;
    } else if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch });
      i++;
    } else {
      throw new Error('Token inválido');
    }
  }
  return tokens;
}

function apply(op: string, stack: number[]): void {
  if (op === 'u') {
    const a = stack.pop();
    if (a === undefined) throw new Error('Expressão inválida');
    stack.push(-a);
    return;
  }
  const b = stack.pop();
  const a = stack.pop();
  if (a === undefined || b === undefined) throw new Error('Expressão inválida');
  switch (op) {
    case '+': stack.push(a + b); break;
    case '-': stack.push(a - b); break;
    case '*': stack.push(a * b); break;
    default: stack.push(a / b);
  }
}

export function evaluateExpression(expression: string): number {
  const tokens = tokenize(expression);
  if (tokens.length === 0) throw new Error('Expressão vazia');

  const output: number[] = [];
  const ops: string[] = [];
  let expectOperand = true;

  for (const token of tokens) {
    if (token.type === 'num') {
      if (!expectOperand) throw new Error('Expressão inválida');
      output.push(token.value);
      expectOperand = false;
    } else if (token.type === 'paren' && token.value === '(') {
      if (!expectOperand) throw new Error('Expressão inválida');
      ops.push('(');
    } else if (token.type === 'paren') {
      if (expectOperand) throw new Error('Expressão inválida');
      while (ops.length && ops[ops.length - 1] !== '(') apply(ops.pop() as string, output);
      if (ops.pop() !== '(') throw new Error('Parênteses desbalanceados');
    } else if (token.value === 'u') {
      if (!expectOperand) throw new Error('Expressão inválida');
      ops.push('u');
    } else {
      if (expectOperand) throw new Error('Expressão inválida');
      while (ops.length && ops[ops.length - 1] !== '(' && PRECEDENCE[ops[ops.length - 1]] >= PRECEDENCE[token.value]) {
        apply(ops.pop() as string, output);
      }
      ops.push(token.value);
      expectOperand = true;
    }
  }

  if (expectOperand) throw new Error('Expressão incompleta');
  while (ops.length) {
    const op = ops.pop() as string;
    if (op === '(') throw new Error('Parênteses desbalanceados');
    apply(op, output);
  }

  if (output.length !== 1 || !Number.isFinite(output[0])) throw new Error('Resultado inválido');
  return output[0];
}
