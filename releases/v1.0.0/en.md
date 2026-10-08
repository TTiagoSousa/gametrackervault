First release of GameTracker Vault, installable on Proxmox

### Features
- **ui**: "Lombadas" design built around game-case spines: shelf of spines on the login, one shelf per status on the home page
- **home**: playing, finished and beaten shelves with their counts, ready for the game library
- **auth**: admin sign-in; the first account is created by the installer and public sign-up is closed afterwards
- **admin**: user list and new users, plus a Version card and a Versions page with release notes and one-click updates
- **settings**: theme (day, night, automatic) and language (Portuguese, English, Spanish)
- **deploy**: one-line Proxmox LXC installer with PostgreSQL inside the container, gametracker-config and gametracker-update commands, and daily backups

### Improvements
- **deploy**: failed updates roll back to the previous version automatically
