# Task Service Working Rules

- Use Node.js 22 and built-in modules only.
- Preserve the existing public exports and response shapes.
- Keep authorization decisions in the service layer; the HTTP adapter only maps requests and errors.
- `npm test` is the required verification command.
- Do not read or modify files outside this repository.
