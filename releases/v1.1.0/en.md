The first version with games: search, game pages, your shelf, stats and a Claude assistant

### Features
- **games**: search the whole IGDB catalogue by name or by platform, genre, theme, mode, perspective, type, year and minimum rating, sorted by popularity, rating, date or name; the IGDB key is set once by the admin
- **games**: a page for every game with cover, ratings, details, average time to beat, images and videos, and shelves of its expansions, DLCs, remakes and games from the same series
- **library**: "My shelf" panel pinned on the right of each game page: status (playing, paused, later, dropped, main story, with side content, 100%), hours, dates, a 1–10 rating and notes; every choice can be cleared or undone before saving
- **home**: four shelves (Playing, Finished, Up next, Dropped) with the covers face-out, and "Not sure what to play?" to pick a random game from your list or discover a well-rated one you don't have
- **stats**: a Stats page with hours played (yours, or the IGDB average for the way you finished a game when you didn't log them), shelf by status, time to clear your list, games finished per year, ratings, genres and highlights
- **assistant**: chat with Claude about games using your own Anthropic key and model; it knows your shelf, ratings and notes to recommend what to play next, can look games up on IGDB and links them to their pages
- **account**: change your name and password; admins edit and delete accounts
- **help**: a Help page on adding the Claude and IGDB keys, choosing a model, how stats are calculated and how updates come from Forgejo

### Improvements
- **security**: the session is checked against the database on every request, so a role change or a deleted account takes effect at once
- **security**: the assistant key is encrypted on the server and never sent back to the browser
