// REQ-005: client-side filtering of the clubs list by name / description.

export function filterClubs(clubs, query) {
    const list = Array.isArray(clubs) ? clubs : [];
    const needle = String(query ?? '').trim().toLowerCase();
    if (!needle) return list;
    return list.filter((club) => {
        const name = String(club?.name ?? '').toLowerCase();
        const description = String(club?.description ?? '').toLowerCase();
        return name.includes(needle) || description.includes(needle);
    });
}
