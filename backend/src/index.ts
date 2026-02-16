// Azure Functions Node.js v4 programming model entrypoint.
// Importing modules registers triggers via app.http/app.storageBlob.

import "./functions/http/authMe";
import "./functions/http/departments";
import "./functions/http/cases";
import "./functions/http/evidence";
import "./functions/http/users";

import "./functions/triggers/evidenceBlobIngest";
