Primera versión de GameTracker Vault, instalable en Proxmox

### Features
- **ui**: diseño "Lombadas", construido alrededor de los lomos de las cajas de juegos: una estantería de lomos en el login y una balda por estado en el Inicio
- **home**: baldas Jugando, Terminados y Completados con sus recuentos, listas para la biblioteca de juegos
- **auth**: acceso del administrador; la primera cuenta la crea el instalador y el registro público se cierra después
- **admin**: lista y creación de usuarios, además de la tarjeta de versión y la página de versiones con las notas de cada release y actualización con un clic
- **settings**: tema (día, noche, automático) e idioma (portugués, inglés, español)
- **deploy**: instalador LXC para Proxmox en una sola línea, con PostgreSQL dentro del contenedor, comandos gametracker-config y gametracker-update y copias de seguridad diarias

### Improvements
- **deploy**: una actualización que falle vuelve sola a la versión anterior
