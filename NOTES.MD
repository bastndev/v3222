# 📦 First Publish

```bash
# Login (only once)
npm login --auth-type=web

# Verify session
npm whoami

# Check if the package name is available
npm view v3222

# Review the files that will be published
npm pack --dry-run

# Publish
npm publish
```

<!-- -- -- --- ---- --- TODO: Update --- --- --- -- - -->

# Verify `NPM` package ✅

## 1 — npm Token **Settings**

```shell
https://www.npmjs.com/package/v3222/access
```

| Campo                | Valor                      |
| --------------------- | ------------------------  |
| Organization or user  | `bastndev`                |
| Repository            | v3222                     |
| Workflow filename     | `publish.yml`             |
| Environment name      | Void (------------------) |
| Allowed actions       | `Allow npm publish`       |

→ **Set up connection**

---

## 2 — Workflow **Create**

```sh
.github/workflows/publish.yml
```

```yaml
name: Publish

on:
  push:
    tags:
      - "v*"

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Build
        run: bun run build

      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          registry-url: "https://registry.npmjs.org"

      - name: Update npm
        run: npm install -g npm@latest

      - name: Publish with provenance
        run: npm publish --provenance --access public
```

Commit and push to `main`.

---

## 3 — Publish and Deploy

```bash
git checkout main
git pull origin main
git merge dev
git push origin main
```

```bash
npm version patch
git push origin main
git push origin v0.0.2
```