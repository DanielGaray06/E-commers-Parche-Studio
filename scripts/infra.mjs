#!/usr/bin/env node
/* ===========================================================================
   Infraestructura local — MySQL y Redis
   ---------------------------------------------------------------------------
   Arranca, detiene y consulta los dos servicios que necesita la API, sin
   necesidad de Docker ni de permisos de administrador.

   ¿Por qué no Docker? El equipo tiene la virtualización desactivada en la BIOS
   (AMD-V), así que WSL2 no puede arrancar. MySQL y Redis se instalaron con
   Scoop (a nivel de usuario) y este script los gestiona.

   Uso:
     node scripts/infra.mjs up       # arranca los que estén apagados
     node scripts/infra.mjs down     # detiene los que estén encendidos
     node scripts/infra.mjs status   # muestra el estado

   Cuando la virtualización esté activa se puede usar docker-compose.yml, que
   ofrece exactamente los mismos servicios de forma aislada.
   =========================================================================== */

import { spawn, execSync } from 'node:child_process';
import { connect } from 'node:net';

const SERVICES = [
  {
    name: 'MySQL',
    port: 3306,
    command: 'mysqld',
    args: ['--defaults-file=C:/Users/danie/scoop/persist/mysql/my.ini', '--console'],
    hint: 'scoop install mysql',
  },
  {
    name: 'Redis',
    port: 6379,
    command: 'redis-server',
    args: [
      '--port',
      '6379',
      '--bind',
      '127.0.0.1',
      '--save',
      '',
      '--appendonly',
      'no',
      '--dir',
      'C:/Users/danie/scoop/persist/redis',
    ],
    hint: 'scoop install redis',
  },
];

/** ¿Hay algo escuchando en el puerto? */
function isUp(port) {
  return new Promise((resolve) => {
    const socket = connect({ host: '127.0.0.1', port });
    const finish = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(900);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });
}

/** Espera activa hasta que el puerto responda o se agote el tiempo. */
async function waitFor(port, seconds = 40) {
  for (let attempt = 0; attempt < seconds; attempt += 1) {
    if (await isUp(port)) return true;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

async function start(service) {
  if (await isUp(service.port)) {
    console.log(`  · ${service.name}: ya estaba encendido (puerto ${service.port}).`);
    return true;
  }

  try {
    const child = spawn(service.command, service.args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      shell: process.platform === 'win32',
    });
    child.unref();
  } catch (error) {
    console.error(`  ✗ ${service.name}: no pude ejecutarlo (${error.message}).`);
    console.error(`    Instálalo con: ${service.hint}`);
    return false;
  }

  const ready = await waitFor(service.port);
  if (ready) console.log(`  ✓ ${service.name}: encendido en el puerto ${service.port}.`);
  else console.error(`  ✗ ${service.name}: no respondió en el puerto ${service.port}.`);
  return ready;
}

/** Busca el proceso que escucha en un puerto y lo termina (solo Windows). */
function stopByPort(port) {
  if (process.platform !== 'win32') {
    console.error('  · Detener servicios está implementado solo para Windows.');
    return false;
  }

  try {
    const output = execSync(`netstat -ano -p tcp | findstr :${port}`, { encoding: 'utf8' });
    const pids = new Set();

    for (const line of output.split(/\r?\n/)) {
      if (!line.includes('LISTENING')) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') pids.add(pid);
    }

    if (pids.size === 0) return true;

    for (const pid of pids) {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    }
    return true;
  } catch {
    return false;
  }
}

async function up() {
  console.log('\nArrancando infraestructura local…\n');
  let ok = true;
  for (const service of SERVICES) ok = (await start(service)) && ok;
  console.log(ok ? '\nTodo listo.\n' : '\nAlgo no arrancó (ver arriba).\n');
  process.exitCode = ok ? 0 : 1;
}

async function down() {
  console.log('\nDeteniendo infraestructura local…\n');
  for (const service of SERVICES) {
    if (!(await isUp(service.port))) {
      console.log(`  · ${service.name}: ya estaba apagado.`);
      continue;
    }
    const ok = stopByPort(service.port);
    console.log(ok ? `  ✓ ${service.name}: detenido.` : `  ✗ ${service.name}: no pude detenerlo.`);
  }
  console.log('');
}

async function status() {
  console.log('\nEstado de la infraestructura\n');
  for (const service of SERVICES) {
    const up = await isUp(service.port);
    console.log(`  ${up ? '✓' : '✗'} ${service.name.padEnd(6)} puerto ${service.port} — ${up ? 'encendido' : 'apagado'}`);
  }
  console.log('');
}

const action = process.argv[2] ?? 'status';

if (action === 'up') await up();
else if (action === 'down') await down();
else if (action === 'status') await status();
else {
  console.error(`Acción desconocida: "${action}". Usa up, down o status.`);
  process.exitCode = 1;
}
