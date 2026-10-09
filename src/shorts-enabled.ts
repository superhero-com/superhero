// Opt in explicitly at build time; changing this requires rebuilding the web app.
export const SHORTS_ENABLED = import.meta.env.ENABLE_SHORTS === 'true';
