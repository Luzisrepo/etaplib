# Contributing to ETAP Biblioteca

Thank you for considering a contribution to the ETAP Biblioteca platform. This document outlines the workflow, expectations, and standards for all contributors—whether you are fixing a bug, adding a feature, or improving documentation.

## Code of Conduct
By participating in this project, you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behaviour to the project maintainers.

## Getting Started

### Prerequisites
- Node.js (v18 or later)
- npm or yarn
- Git
- A Supabase account (for local development – a free tier is sufficient)

### Setup
1. Fork the repository and clone your fork.
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and fill in your Supabase credentials.
4. Run the development server: `npm run dev`
5. Access the application at `http://localhost:3000`.

## Development Workflow

### Branching
- **main** – Production-ready branch. All changes must come via pull requests.
- Feature branches: `feature/description`
- Bugfix branches: `fix/issue-id-description`
- Hotfixes: `hotfix/description`

Keep your branch up to date with `main` by rebasing frequently.

### Commit Messages
We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` – new feature
- `fix:` – bug fix
- `docs:` – documentation changes
- `style:` – code style (formatting, etc.)
- `refactor:` – code restructuring
- `perf:` – performance improvements
- `test:` – adding/updating tests
- `chore:` – build/tooling changes

Example: `feat(upload): add drag-and-drop for multiple files`

### Pull Request Process
1. Open a pull request against `main` with a clear title and description (use the provided template).
2. Ensure all checks pass (lint, build, tests).
3. Request a review from at least one maintainer.
4. Address feedback promptly.
5. Once approved, a maintainer will squash‑merge your PR.

## Coding Standards

### TypeScript
- Use strict mode (`strict: true`).
- Prefer explicit types over `any`. Use `unknown` when necessary.
- Define interfaces for object shapes; use types for unions and mapped types.
- All exported functions must have explicit return type annotations.

### React / Next.js
- Use functional components with hooks.
- Keep components focused and reusable.
- Use `useMemo` and `useCallback` for expensive operations.
- Client‑side components must include `'use client'` directive.
- Use `next/dynamic` for lazy loading of heavy components.

### Styling
- Use Tailwind CSS utility classes.
- Theming is controlled via CSS variables defined in `lib/settings.ts`.
- Avoid custom global CSS unless absolutely necessary.
- Ensure responsive design across all breakpoints.

## Testing
- **Unit tests**: Use Jest + React Testing Library for component and utility tests.
- **Integration tests**: End‑to‑end tests using Cypress or Playwright (if configured).
- Run `npm test` to execute unit tests.
- Write tests for new features and bug fixes.

## Submitting Changes
- Before opening a PR, run `npm run lint` and `npm run format`.
- Write a descriptive PR that references the issue it addresses.
- Include screenshots or GIFs for UI changes.
- Ensure your changes do not introduce new warnings or console errors.

## Additional Resources
- [Project README](README.md)
- [Architecture Manual](README.md#architecture) – Refer to the main documentation for system design.
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)

Thank you for contributing to ETAP Biblioteca. Together we build a better educational resource platform.
