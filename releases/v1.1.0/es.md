La primera versión con juegos: búsqueda, página de cada juego, tu estantería, estadísticas y un asistente con Claude

### Features
- **games**: búsqueda en todo el catálogo de IGDB por nombre o por plataforma, género, tema, modo, perspectiva, tipo, año y nota mínima, ordenada por popularidad, nota, fecha o nombre; la clave de IGDB la pone una vez el administrador
- **games**: una página para cada juego, con portada, notas, ficha, tiempo medio para terminarlo, imágenes y vídeos, y baldas con sus expansiones, DLC, remakes y juegos de la misma saga
- **library**: panel "Mi estantería" fijo a la derecha de cada juego: estado (jugando, en pausa, más tarde, abandonado, historia principal, con secundarias, 100%), horas, fechas, nota del 1 al 10 y notas; todo se puede borrar o deshacer antes de guardar
- **home**: cuatro baldas (Jugando, Terminados, Por jugar, Abandonados) con las portadas de frente, y "¿No sabes a qué jugar?" para sacar un juego al azar de tu lista o descubrir uno bien valorado que aún no tienes
- **stats**: página de estadísticas con las horas jugadas (las tuyas o, cuando no las anotaste, la media de IGDB para la forma en que terminaste el juego), la estantería por estado, el tiempo para acabar la lista, los terminados por año, las notas, los géneros y los destacados
- **assistant**: conversa con Claude sobre juegos con tu propia clave de Anthropic y el modelo que elijas; conoce tu estantería, tus notas y lo que escribiste para recomendarte a qué jugar, busca en IGDB y enlaza los juegos a sus páginas
- **account**: cambiar el nombre y la contraseña; los administradores editan y eliminan cuentas
- **help**: página de ayuda sobre cómo poner las claves de Claude y de IGDB, qué modelo elegir, cómo se calculan las estadísticas y cómo llegan las actualizaciones desde Forgejo

### Improvements
- **security**: la sesión se comprueba en la base de datos en cada petición, así que un cambio de rol o una cuenta eliminada cuentan al momento
- **security**: la clave del asistente queda cifrada en el servidor y nunca vuelve al navegador
