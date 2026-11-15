// Screenshots the Claude Design prototype at 390×844, the size of the app's design frames,
// optionally driving it through a flow first.
//
// Usage: node scripts/design-shot.mjs <serve-url> <out-dir> <step>...
//
// <serve-url> comes from the claude_design MCP's `render_preview`. It carries a token: pass it
// on the command line only, never write it to a file, issue, PR or commit.
//
// Steps run in order:
//   shot:<name>               write <out-dir>/<name>.png
//   click:<text>              click the button (or other element) whose text is exactly <text>
//   type:<placeholder>=<text> fill the input with that placeholder
//   focus:<placeholder>       focus the input with that placeholder
//   blur                      blur the focused element
//   wait:<ms>                 wait (each click and type already waits 400ms for transitions)
//   js:<expression>           evaluate JavaScript in the page
//
// Example:
//   node scripts/design-shot.mjs "$URL" "$S/design" shot:signup 'click:Create account' shot:signup-error
import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SETTLE_MS = 400;

const [url, outDir, ...steps] = process.argv.slice(2);
if (!url || !outDir || !steps.some((s) => s.startsWith('shot:'))) {
  console.error('Usage: node scripts/design-shot.mjs <serve-url> <out-dir> <step>... (at least one shot:<name>)');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

// A fresh profile and a random debugging port, so parallel worktrees don't collide.
const profile = mkdtempSync(path.join(tmpdir(), 'design-shot-'));
const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--remote-debugging-port=0',
  `--user-data-dir=${profile}`,
  'about:blank',
]);

let ws;
let nextId = 0;
try {
  ws = await connect();
  await run();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exitCode = 1;
} finally {
  ws?.close();
  const exited = new Promise((resolve) => chrome.once('exit', resolve));
  chrome.kill();
  await exited;
  rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
}

async function connect() {
  let port;
  for (let i = 0; i < 50 && !port; i++) {
    await wait(200);
    try {
      port = readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0];
    } catch {}
  }
  if (!port) throw new Error('Chrome did not start');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const socket = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve);
    socket.addEventListener('error', () => reject(new Error('could not connect to Chrome')));
  });
  return socket;
}

function send(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const onMessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== id) return;
      ws.removeEventListener('message', onMessage);
      if (message.error) reject(new Error(`${method}: ${message.error.message}`));
      else resolve(message.result);
    };
    ws.addEventListener('message', onMessage);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function js(expression) {
  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  return result.value;
}

async function run() {
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url });
  await waitFor('document.readyState === "complete"', 'the prototype to load');
  await js('document.fonts.ready.then(() => true)');
  await wait(1000);
  // The prototype's frame stops at 600px, which cuts off bottom CTAs and error rows. Stretch the
  // app root (the element defining the palette) and its ancestors to the full 844px.
  await js(`(() => {
    let el = [...document.querySelectorAll('div')].find((d) => d.getAttribute('style')?.includes('--paper:'));
    for (; el; el = el.parentElement) el.style.height = '844px';
    return true;
  })()`);
  await wait(200);

  for (const step of steps) {
    const [kind, ...rest] = step.split(':');
    const arg = rest.join(':');
    switch (kind) {
      case 'shot': {
        const { data } = await send('Page.captureScreenshot', { format: 'png' });
        const file = path.join(outDir, `${arg}.png`);
        writeFileSync(file, Buffer.from(data, 'base64'));
        console.log(file);
        break;
      }
      case 'click':
        if (!(await js(clickScript(arg)))) throw new Error(`nothing to click with the text "${arg}"`);
        await wait(SETTLE_MS);
        break;
      case 'type': {
        const [placeholder, ...value] = arg.split('=');
        if (!(await js(typeScript(placeholder, value.join('='))))) throw new Error(`no input with placeholder "${placeholder}"`);
        await wait(SETTLE_MS);
        break;
      }
      case 'focus':
        if (!(await js(`(() => { const el = ${inputByPlaceholder(arg)}; el?.focus(); return !!el; })()`)))
          throw new Error(`no input with placeholder "${arg}"`);
        await wait(SETTLE_MS);
        break;
      case 'blur':
        await js('document.activeElement?.blur(), true');
        await wait(SETTLE_MS);
        break;
      case 'wait':
        await wait(Number(arg));
        break;
      case 'js':
        await js(arg);
        break;
      default:
        throw new Error(`unknown step "${step}"`);
    }
  }
}

async function waitFor(expression, what) {
  for (let i = 0; i < 100; i++) {
    if (await js(expression).catch(() => false)) return;
    await wait(200);
  }
  throw new Error(`timed out waiting for ${what}`);
}

// Prefers a button; falls back to the innermost element with exactly that text.
function clickScript(text) {
  return `(() => {
    const text = ${JSON.stringify(text)};
    const matches = [...document.querySelectorAll('body *')].filter((el) => el.textContent.trim() === text);
    const target = matches.find((el) => el.closest('button, [role=button], a')) ?? matches.at(-1);
    (target?.closest('button, [role=button], a') ?? target)?.click();
    return !!target;
  })()`;
}

function inputByPlaceholder(placeholder) {
  return `[...document.querySelectorAll('input, textarea')].find((x) => x.placeholder === ${JSON.stringify(placeholder)})`;
}

// Sets the value through the native setter so React's onChange sees it.
function typeScript(placeholder, value) {
  return `(() => {
    const el = ${inputByPlaceholder(placeholder)};
    if (!el) return false;
    const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`;
}
