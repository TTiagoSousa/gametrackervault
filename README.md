# GameTracker Vault

Registo pessoal de jogos — o que estás a jogar, o que acabaste e o que passaste.

## Estrutura

| Pasta | O quê |
|---|---|
| `apps/backend` | API NestJS + Prisma + PostgreSQL |
| `apps/frontend` | SPA React + Vite |
| `packages/shared` | tipos e constantes usados pelos dois |
| `deploy/proxmox` | instalador para um container LXC no Proxmox |
| `releases` | notas de cada versão (en, pt-PT, es) |
| `.claude/docs` | documentação técnica |

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
