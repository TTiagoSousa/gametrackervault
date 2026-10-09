A primeira versão com jogos: pesquisa, página de cada jogo, a tua estante, estatísticas e um assistente com o Claude

### Features
- **games**: pesquisa no catálogo inteiro do IGDB por nome ou por plataforma, género, tema, modo, perspetiva, tipo, ano e nota mínima, ordenada por popularidade, nota, data ou nome; a chave do IGDB é posta uma vez pelo administrador
- **games**: uma página para cada jogo, com capa, notas, ficha, tempo médio para acabar, imagens e vídeos, e prateleiras com as expansões, DLCs, remakes e jogos da mesma saga
- **library**: painel "A minha estante" fixo à direita de cada jogo: estado (a jogar, em pausa, mais tarde, abandonado, história principal, com secundárias, 100%), horas, datas, nota de 1 a 10 e notas; tudo se pode limpar ou desfazer antes de guardar
- **home**: quatro prateleiras (A jogar, Concluídos, Para jogar, Abandonados) com as capas de frente, e "Não sabes o que jogar?" para tirar um jogo ao calhas da tua lista ou descobrir um bem avaliado que ainda não tens
- **stats**: página de estatísticas com as horas jogadas (as tuas ou, quando não as escreveste, a média do IGDB para a forma como acabaste o jogo), a estante por estado, o tempo para acabar a lista, os concluídos por ano, as notas, os géneros e os destaques
- **assistant**: conversa com o Claude sobre jogos, com a tua própria chave da Anthropic e o modelo que escolheres; conhece a tua estante, as notas e o que escreveste para te recomendar o que jogar a seguir, pesquisa no IGDB e liga os jogos às páginas deles
- **account**: mudar o nome e a password; os administradores editam e apagam contas
- **help**: página de ajuda sobre como pôr as chaves do Claude e do IGDB, que modelo escolher, como se calculam as estatísticas e como as atualizações vêm do Forgejo

### Improvements
- **security**: a sessão é confirmada na base de dados em cada pedido, por isso uma mudança de papel ou uma conta apagada contam logo
- **security**: a chave do assistente fica cifrada no servidor e nunca volta ao browser
