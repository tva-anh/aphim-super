// ═══════════════════════════════════════════════════════
//  Playlist Service  –  CRUD + localStorage + backend sync
// ═══════════════════════════════════════════════════════
class PlaylistService {
    constructor() {
        this._key = 'cinestream_playlists'; // same as STORAGE_KEYS.PLAYLISTS
    }

    // ── Helpers ──────────────────────────────────────────
    _load() {
        try {
            const legacy = localStorage.getItem('ap_playlists');
            if (legacy) {
                try {
                    const legacyData = JSON.parse(legacy);
                    const currentData = JSON.parse(localStorage.getItem(this._key) || '[]');
                    if (Array.isArray(legacyData) && legacyData.length > 0) {
                        legacyData.forEach(item => {
                            if (!currentData.some(c => c.id === item.id)) {
                                currentData.push(item);
                            }
                        });
                        localStorage.setItem(this._key, JSON.stringify(currentData));
                    }
                    localStorage.removeItem('ap_playlists');
                } catch (e) {}
            }
            return JSON.parse(localStorage.getItem(this._key) || '[]');
        }
        catch { return []; }
    }
    _save(playlists) {
        localStorage.setItem(this._key, JSON.stringify(playlists));
        // best-effort sync to backend
        if (typeof authService !== 'undefined' && authService.isLoggedIn()) {
            authService.updateProfile({ playlists }).catch(() => {});
        }
    }
    _uid() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }

    // ── Public API ────────────────────────────────────────

    /** Get all playlists */
    getAll() { return this._load(); }

    /** Get one playlist by id */
    getById(id) { return this._load().find(p => p.id === id) || null; }

    /** Create new playlist, returns the new playlist object */
    create(name, description = '') {
        if (!name || !name.trim()) return null;
        const playlists = this._load();
        const pl = {
            id: this._uid(),
            name: name.trim(),
            description: description.trim(),
            movies: [],
            createdAt: new Date().toISOString()
        };
        playlists.unshift(pl);
        this._save(playlists);
        return pl;
    }

    /** Rename / update description */
    update(id, name, description) {
        const playlists = this._load();
        const idx = playlists.findIndex(p => p.id === id);
        if (idx === -1) return false;
        if (name !== undefined) playlists[idx].name = name.trim();
        if (description !== undefined) playlists[idx].description = description.trim();
        this._save(playlists);
        return true;
    }

    /** Delete a playlist */
    delete(id) {
        const playlists = this._load().filter(p => p.id !== id);
        this._save(playlists);
    }

    /** Add movie to playlist. movie = {slug, name, thumb_url, year} */
    addMovie(playlistId, movie) {
        const playlists = this._load();
        const pl = playlists.find(p => p.id === playlistId);
        if (!pl) return false;
        if (pl.movies.some(m => m.slug === movie.slug)) return false; // already in
        pl.movies.push({ slug: movie.slug, name: movie.name, thumb_url: movie.thumb_url, year: movie.year, addedAt: new Date().toISOString() });
        this._save(playlists);
        return true;
    }

    /** Remove movie from playlist */
    removeMovie(playlistId, slug) {
        const playlists = this._load();
        const pl = playlists.find(p => p.id === playlistId);
        if (!pl) return;
        pl.movies = pl.movies.filter(m => m.slug !== slug);
        this._save(playlists);
    }

    /** Check if movie is in any playlist */
    isInPlaylist(playlistId, slug) {
        const pl = this.getById(playlistId);
        return pl ? pl.movies.some(m => m.slug === slug) : false;
    }

    /** Sync from backend profile data (call after login) */
    syncFromProfile(profilePlaylists) {
        if (!Array.isArray(profilePlaylists)) return;
        localStorage.setItem(this._key, JSON.stringify(profilePlaylists));
    }
}

// Singleton
const playlistService = new PlaylistService();
