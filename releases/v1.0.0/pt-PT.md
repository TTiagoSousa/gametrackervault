Primeira versão do GameTracker Vault, instalável no Proxmox

### Features
- **ui**: design "Lombadas", construído à volta das lombadas das caixas de jogos: uma estante de lombadas no login e uma prateleira por estado no Início
- **home**: prateleiras A jogar, Acabados e Passados com as respetivas contagens, prontas para a biblioteca de jogos
- **auth**: entrada do administrador; a primeira conta é criada pelo instalador e o registo público fica fechado a seguir
- **admin**: lista e criação de utilizadores, mais o card de versão e a página de versões com as notas de cada release e atualização com um clique
- **settings**: tema (dia, noite, automático) e língua (português, inglês, espanhol)
- **deploy**: instalador LXC para o Proxmox numa só linha, com PostgreSQL dentro do container, comandos gametracker-config e gametracker-update e backups diários

### Improvements
- **deploy**: uma atualização que falhe volta sozinha à versão anterior
