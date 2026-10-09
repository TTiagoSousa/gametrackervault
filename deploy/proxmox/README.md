# Instalar no Proxmox (LXC)

Um script no host do Proxmox cria um container Debian 13 e instala lá dentro tudo o que
a app precisa. Sem Docker e sem Coolify.

```
┌─────────────────────── CT (Debian 13, unprivileged) ───────────────────────┐
│                                                                             │
│   nginx :80 ──┬── /        → /var/www/gametracker (frontend, ficheiros)     │
│               └── /api/*   → 127.0.0.1:3000       (backend, systemd)        │
│                                    │                                        │
│                               PostgreSQL 17 (só localhost)                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

| Peça | Onde |
|---|---|
| Código | `/opt/gametracker` (clone do repo, utilizador `gametracker`) |
| Configuração | `/etc/gametracker/gametracker.env` |
| Serviço | `gametracker.service` (`node dist/src/main.js`) |
| Frontend publicado | `/var/www/gametracker` |
| Base de dados | PostgreSQL local, base e utilizador `gametracker` |
| Backups | `/var/backups/gametracker`, todos os dias às 03:30, 14 dias |
| Credenciais geradas | `/root/gametracker-credentials.txt` |

## 1. Criar e instalar

Na **Shell do host** do Proxmox (Datacenter → nó → Shell), uma linha:

```bash
bash -c "$(curl -fsSL https://forgejo.home-sousa.me/Tiago/gameTrackerVault/raw/branch/main/deploy/proxmox/ct-create.sh)"
```

Abre um menu (em inglês, ao estilo dos community-scripts):

- **Default settings** — próximo CT livre, primeiro storage ativo, 16 GB, 2 CPUs,
  2 GB de RAM, DHCP, DNS do host, endereço `http://<IP do CT>`, a última versão.
- **Advanced settings** — ecrã a ecrã, já preenchido com a sugestão:
  - ID e hostname (valida se o ID está livre);
  - storage do disco e dos templates, escolhidos de uma lista com o espaço livre;
  - disco, CPUs, RAM, swap;
  - bridge (lista), **DHCP ou IP estático** (IP/prefixo + gateway), VLAN opcional;
  - DNS do host ou servidores próprios;
  - arrancar com o host;
  - endereço da app: IP do container ou domínio próprio;
  - utilizador e password do admin (em branco = `admin`);
  - versão: **a última release** (a tag `vX.Y.Z` mais recente, por omissão) ou, para
    testar, a branch `staging` ou `develop`; token só se o repo for privado. As
    atualizações seguem sempre as releases.

Um valor inválido volta a ser pedido em vez de abortar. No fim aparece o ecrã **Review**
com tudo o que foi escolhido: *Create the container*, *Edit settings* ou *Cancel*.


**Utilizador inicial: `admin` / `admin`.** Troca a password antes de abrires a app à
internet.

Sem menus (automação): `NONINTERACTIVE=1` e as variáveis que quiseres mudar — lista
no cabeçalho do `ct-create.sh`:

```bash
NONINTERACTIVE=1 STORAGE=zfs_pool NET_MODE=static IP=192.168.0.61/24 GATEWAY=192.168.0.1 APP_URL=https://gametracker.home-sousa.me bash -c "$(curl -fsSL https://forgejo.home-sousa.me/Tiago/gameTrackerVault/raw/branch/main/deploy/proxmox/ct-create.sh)"
```

## 2. Domínio e SSL

No Nginx Proxy Manager: `gametracker.home-sousa.me` → `http://<IP do CT>:80`, com SSL.

O `APP_URL` tem de ser o endereço por onde abres a app: é a origem aceite pelo CORS e
decide se o cookie de sessão é `secure` (só com `https`). Se o mudares depois,
ajusta `FRONTEND_URL` com o `gametracker-config`.

## 3. Configurar

Dentro do CT (`pct enter <CTID>`):

```bash
gametracker-config
```

Abre um menu com as definições e o valor atual de cada uma (segredos mascarados):
↑/↓ escolhe, Enter abre a caixa para alterar, **Save** grava e pergunta se reinicia o
backend para aplicar. As alteradas ficam marcadas com `*`; **Quit** sai sem gravar.
A base de dados e o `JWT_SECRET` não aparecem no menu.
`gametracker-config --raw` abre o ficheiro inteiro no nano.

### Pesquisa de jogos (IGDB)

A chave do IGDB não vai no ficheiro de configuração: o admin põe-na na app, em
**Admin → Catálogo de jogos (IGDB)**, com o Client ID e o Client Secret de uma
aplicação Twitch (https://dev.twitch.tv/console/apps, tipo *Confidential*). A app
valida-as com a Twitch antes de gravar e guarda o secret cifrado na base de dados.

> ⚠ **`TOKEN_ENCRYPTION_KEY` não se muda.** É gerada pelo instalador (cópia em
> `/root/gametracker-credentials.txt`) e cifra os segredos das integrações. Com
> outra chave, o admin tem de voltar a introduzir o Client Secret. O
> `gametracker-config` recusa gravar uma alteração a essa linha; instalações
> antigas sem ela recebem-na na primeira atualização.

## 4. Atualizar

**Pela app (admin):** página **Admin** → card **Versão** → *Atualizar para vX.Y.Z*, ou
*Ver versões* para a lista com as notas de cada release e escolher qualquer versão mais
recente. Saltar versões é seguro (as migrações aplicam-se todas); voltar para trás não é
permitido. A janela mostra o progresso e recarrega a página no fim.

**Pela consola (dentro do CT):**

```bash
gametracker-update             # a última release (tag vX.Y.Z)
gametracker-update v1.4.0      # uma release específica
gametracker-update develop     # um branch (testes)
FORCE=1 gametracker-update     # recompilar mesmo sem nada novo
```

Faz fetch, checkout da versão, `npm ci`, build, migrações, publica o frontend, reescreve
as units e o nginx e reinicia o backend. **Se um passo falhar, volta sozinho à versão
anterior** (checkout, build, restart) e a app continua a funcionar.

Como o botão funciona: o backend corre sem privilégios e só escreve
`/var/lib/gametracker/updates/request` com a versão; a unit `gametracker-updater.path`
(root) vê o ficheiro e corre `update.sh --from-request`, que escreve o progresso em
`status.json` e o output em `update.log` na mesma pasta. Logs: `journalctl -u gametracker-updater`.

## Releases

Uma release é uma tag `vX.Y.Z` anotada no `main`. As notas ficam em
`releases/<versão>/{en,pt-PT,es}.md` e a app mostra as da língua escolhida (inglês como
recurso, depois a mensagem da tag). Para lançar, no `main` atualizado:

```bash
npm run release -- --dry-run   # vê a versão e as notas
npm run release -- --prepare   # escreve releases/<versão>/en.md a partir dos commits
# escrever pt-PT.md e es.md ao lado, commit no main
npm run release -- --push      # cria a tag (mensagem = en.md) e envia-a
```

A versão sobe pelos commits desde a última release: `feat` → minor, `fix`/`perf`/
`refactor` → patch, `!` ou `BREAKING CHANGE` → major. As notas agrupam-se em
*Features*, *Fixes* e *Improvements* (os `chore`/`docs`/`ci` ficam de fora).
`--title "…"` põe uma frase por cima das notas; `--notes ficheiro.md` usa notas escritas
à mão.

## 5. Manutenção

```bash
journalctl -u gametracker -f          # logs do backend
systemctl status gametracker nginx postgresql
/opt/gametracker/deploy/proxmox/backup.sh            # backup agora
gunzip -c /var/backups/gametracker/<ficheiro>.sql.gz | runuser -u postgres -- psql -d gametracker   # repor
```

O backup do Proxmox (vzdump) apanha o container inteiro, mas um snapshot com o Postgres
a correr nem sempre é consistente — o dump diário é o que garante a base de dados.

## Utilizadores

O instalador cria o primeiro utilizador (ADMIN, por omissão `admin`/`admin`). A partir daí o registo público está
fechado: as contas novas criam-se no painel de Admin da app.

## Reinstalar por cima

`bash /opt/gametracker/deploy/proxmox/install.sh` dentro do CT pode correr outra vez: a
configuração, os segredos e a base de dados que já existem ficam como estão.
