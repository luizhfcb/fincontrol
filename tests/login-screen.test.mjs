import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8');

const html = read('index.html');
const css = read('css', 'main.css');
const auth = read('js', 'services', 'auth.js');
const theme = read('js', 'services', 'theme.js');

const loginScreen = html.slice(
  html.indexOf('<div id="login-screen">'),
  html.indexOf('<div id="mobile-app">'),
);

test('a tela de login não exibe valores em reais inventados', () => {
  // O painel decorativo antigo mostrava "R$ 5.450,20" e afins antes de qualquer
  // login. Num app de finanças isso se lê como saldo real de alguém.
  assert.equal(/R\$\s*[\d.,]+/.test(loginScreen), false, 'valor monetário fictício na tela de login');
});

test('o login não faz requisição externa antes do consentimento', () => {
  // O ícone do Google vinha de google.com/favicon.ico: um request ao Google
  // só por abrir a tela, e um ícone quebrado offline.
  assert.equal(/src="https?:\/\//.test(loginScreen), false, 'recurso remoto na tela de login');
  assert.ok(loginScreen.includes('class="login-g"'), 'logo do Google deve ser SVG inline');
});

test('a tela de login tem um h1 só e o conteúdo em <main>', () => {
  assert.ok(loginScreen.includes('<main class="login-card">'));
  assert.equal((loginScreen.match(/<h1/g) || []).length, 1);
  assert.equal((loginScreen.match(/<h2/g) || []).length, 0);
});

test('o botão de entrar tem estado pendente e bloqueia clique repetido', () => {
  assert.ok(loginScreen.includes('id="loginBtn"'));
  assert.ok(loginScreen.includes('class="login-spinner"'));
  assert.ok(auth.includes("getAttribute('aria-busy') === 'true'"), 'sem guarda contra clique duplo');
  assert.ok(auth.includes("button?.setAttribute('aria-busy', 'true')"));
  assert.ok(css.includes('.login-btn[aria-busy="true"]'), 'sem estilo para o estado pendente');
});

test('o tema pode ser trocado antes de entrar', () => {
  assert.ok(loginScreen.includes('id="loginThemeBtn"'));
  assert.ok(theme.includes('#loginThemeBtn'), 'applyTheme não atualiza o botão do login');
});

test('o botão de entrar usa os tokens de tema, não branco fixo', () => {
  // Antes era um gradiente branco com sombra branca: em tema claro virava um
  // botão branco sobre cartão branco.
  const rule = css.match(/^\.login-btn\{[^}]*\}/m);
  assert.ok(rule, 'regra .login-btn não encontrada');
  assert.ok(rule[0].includes('var(--accent)'));
  assert.equal(/#fff{3}|#ffffff|rgba\(255,255,255/.test(rule[0].replace('color:#fff', '')), false);
});

test('nenhuma sobra do layout de duas colunas ficou no CSS', () => {
  for (const dead of ['login-shell', 'login-hero', 'login-panel', 'hero-stat-card', 'hero-preview', 'login-trust-list', 'login-badge']) {
    assert.equal(css.includes(dead), false, `regra órfã no CSS: .${dead}`);
    assert.equal(html.includes(dead), false, `classe órfã no HTML: .${dead}`);
  }
});

test('o cartão centraliza por margin auto, não por align-items', () => {
  // Com align-items:center um cartão mais alto que a viewport tem o topo
  // cortado e o scroll não alcança.
  assert.match(css, /body\.logged-out #login-screen\{[^}]*overflow-y:auto/);
  assert.equal(/body\.logged-out #login-screen\{[^}]*align-items:center/.test(css), false);
  assert.match(css, /\.login-card\{[^}]*margin:auto/);
});
