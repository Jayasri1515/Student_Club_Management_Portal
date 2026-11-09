// REQ-007: one row of the activities list with correct, null-safe IDs.

import { getActivityDisplay } from '../utils/activity.js';

// REQ-008: when onEdit / onDelete are supplied, Edit and Delete buttons are shown; they are
// disabled (with an explanatory title) when the user is not permitted (canEdit / canDelete)
// or the activity has no id. Same pattern as the Update / Delete Club buttons.
export default function ActivityItem({
    activity,
    onEdit,
    onDelete,
    canEdit = false,
    canDelete = false,
    busy = false,
}) {
    const hasId = activity?.id !== undefined && activity?.id !== null;
    const { activityId, clubId, clubName, title, description, date } = getActivityDisplay(activity);
    return (
        <li className="list-item">
            <span className="list-item-text">
                <strong>{title}</strong>
                {description && <span className="description-text"> - {description}</span>}
                <span className="description-text">
                    {' '}(Club: {clubName}{date ? `, Date: ${date}` : ''})
                </span>
                <span className="activity-ids">
                    {' '}[Activity ID: {activityId} | Club ID: {clubId}]
                </span>
            </span>
            {(onEdit || onDelete) && (
                <div className="list-item-buttons">
                    {onEdit && (
                        <button
                            type="button"
                            className="button list-update"
                            aria-label={`Edit activity ${title}`}
                            disabled={!canEdit || !hasId || busy}
                            title={canEdit ? undefined : "Students cannot edit activities"}
                            onClick={() => onEdit(activity)}
                        >
                            Edit
                        </button>
                    )}
                    {onDelete && (
                        <button
                            type="button"
                            className="button list-delete"
                            aria-label={`Delete activity ${title}`}
                            disabled={!canDelete || !hasId || busy}
                            title={canDelete ? undefined : "Students cannot delete activities"}
                            onClick={() => onDelete(activity)}
                        >
                            Delete
                        </button>
                    )}
                </div>
            )}
        </li>
    );
}
