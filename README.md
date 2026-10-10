# GameTracker Vault

Registo pessoal de jogos: o que estás a jogar, o que acabaste e o que queres jogar, com estatísticas, um assistente com o Claude e uma app Android.

## Estrutura

| Pasta | O quê |
|---|---|
| `apps/backend` | API NestJS + Prisma + PostgreSQL |
| `apps/frontend` | SPA React + Vite |
| `apps/android` | app Android (WebView ligada ao teu servidor) |
| `packages/shared` | tipos e constantes usados pelos dois |
| `deploy/proxmox` | instalador para um container LXC no Proxmox |
| `releases` | notas de cada versão (en, pt-PT, es) |
| `.claude/docs` | documentação técnica |

## App Android

**[Descarregar o APK](https://forgejo.home-sousa.me/Tiago/gameTrackerVault/raw/branch/main/apps/frontend/public/downloads/gametracker-vault.apk)**
(Android 8 ou mais recente). Também se descarrega na própria app, em **Ajuda → App
Android**, servido pelo teu servidor.

No telemóvel: abre o ficheiro, permite instalar apps dessa origem se o Android pedir e
carrega em **Instalar**. Na primeira vez, escreve o endereço do teu servidor (o mesmo do
browser) e entra com o teu utilizador. Para gerar um APK novo: `npm run build:android`
(ver [`.claude/docs/17-app-android.md`](./.claude/docs/17-app-android.md)).

## Começar

```bash
npm install
cp apps/backend/.env.example apps/backend/.env   # e preencher
npm run dev
```

Requer Node 22+ e um PostgreSQL. Detalhes em [`CLAUDE.md`](./CLAUDE.md) e em
[`.claude/docs`](./.claude/docs/README.md).

## Instalar no Proxmox

Ver [`deploy/proxmox/README.md`](./deploy/proxmox/README.md): um script no host cria o
container e instala a aplicação com a base de dados lá dentro.
