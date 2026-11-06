// Visible notice that authentication in this app is development-only.
//
// The backend's POST /api/auth/login does not verify the password and returns no
// token, POST /api/auth/register stores whatever role the client sends, and no
// endpoint checks roles. The Admin / Leader / Student rules in the UI are
// therefore a convenience, not a security control. This notice must not be
// used to imply otherwise.

export default function DevAuthNotice({ variant = 'banner' }) {
    if (variant === 'inline') {
        return (
            <p role="note" className="auth-notice auth-notice-inline">
                Development-only login: the backend does not verify passwords. Do not use a real password.
            </p>
        );
    }
    return (
        <div role="note" className="auth-notice">
            <strong>Development-only authentication.</strong> The backend does not verify passwords or issue tokens, so
            your role is not verified and the Admin / Leader / Student restrictions in this app are not a security
            control.
        </div>
    );
}
