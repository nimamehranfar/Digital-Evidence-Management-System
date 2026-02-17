export default function UsersPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <p className="muted">User management is disabled in this build.</p>
        </div>
      </div>

      <div className="card">
        <h2>Disabled</h2>
        <p className="muted">
          Roles are managed in Entra ID and continue to work normally. This page will be re-enabled when the user
          listing/provisioning strategy is finalized.
        </p>
      </div>
    </div>
  );
}
