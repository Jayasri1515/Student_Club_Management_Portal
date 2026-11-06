// REQ-007: one row of the activities list with correct, null-safe IDs.

import { getActivityDisplay } from '../utils/activity.js';

export default function ActivityItem({ activity }) {
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
        </li>
    );
}
