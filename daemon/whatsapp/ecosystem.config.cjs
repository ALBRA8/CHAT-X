// S-017 F0.5 — supervisión pm2 para el daemon REAL de WhatsApp (alternativa a
// systemd en la máquina del fundador).
//   Uso:   cd daemon/whatsapp && pm2 start ecosystem.config.cjs && pm2 save
//   Secreto: pm2 start ecosystem.config.cjs --update-env \
//            (WHATSAPP_WEBHOOK_SECRETO y CHATX_URL en el entorno de la shell
//             o en un .env local NO versionado) — JAMÁS inline aquí: este
//             fichero vive en git.
//   Logs:  pm2 logs chatx-wa-daemon
module.exports = {
  apps: [
    {
      name: 'chatx-wa-daemon',
      script: 'index.ts',
      cwd: __dirname,
      // bun corre TypeScript directamente (sin build previo). Ajusta la ruta
      // si bun no está en el PATH del usuario de pm2:
      interpreter: process.env.CHATX_BUN || require('os').homedir() + '/.bun/bin/bun',
      // Semántica de salidas del daemon (misma que la unidad systemd):
      //   exit 1 = logout REAL (credenciales revocadas) → NO reintentar en
      //            bucle: el operador rota desde el panel y re-empareja.
      //   exit 2 = caída reconectable → pm2 reinicia (restart_delay).
      stop_exit_codes: [1],
      restart_delay: 5000,
      max_restarts: 20,
      max_memory_restart: '500M',
      autodump: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
