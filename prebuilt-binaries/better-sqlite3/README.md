# better-sqlite3 prebuilt binary (for airtight / no-internet envs)

`better-sqlite3` is a native module. Its compiled binary (`better_sqlite3.node`)
is normally downloaded from GitHub Releases by `prebuild-install` during
`pnpm install`. In an airtight environment that download is blocked, so the
binary is missing and you get:

```text
Error: Could not locate the bindings file for better-sqlite3
```

These prebuilt binaries let you place the file manually — no internet, no
compiler, no rebuild needed. The `bindings` loader just needs the `.node`
file to exist at the expected path.

## What's here

| Folder        | For                                              |
|---------------|--------------------------------------------------|
| `win32-x64/`  | Windows on Intel/AMD (most machines)             |
| `win32-arm64/`| Windows on ARM (Surface Pro X, Snapdragon, etc.) |

All built for:

- **better-sqlite3 `12.10.0`** (the version pinned in `apps/server`)
- **Node 24 (ABI `137`)**

## Pick the right one

In your env, run:

```bash
node -p "[process.platform, process.arch, process.versions.modules].join(' ')"
```

You should see `win32 x64 137` (or `win32 arm64 137`). If `platform`/`arch`
differ, or `modules` is not `137`, **stop** — these binaries won't load. (e.g.
`modules` is `127` on Node 22, `137` on Node 24.) Ping for a matching build.

## Where to place it

Copy the matching `better_sqlite3.node` into the pnpm store path for the
package (this is the real location every workspace symlink points to):

```text
node_modules\.pnpm\better-sqlite3@12.10.0\node_modules\better-sqlite3\build\Release\better_sqlite3.node
```

### PowerShell (run from the repo root)

```powershell
$dest = "node_modules\.pnpm\better-sqlite3@12.10.0\node_modules\better-sqlite3\build\Release"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Copy-Item "prebuilt-binaries\better-sqlite3\win32-x64\better_sqlite3.node" "$dest\better_sqlite3.node" -Force
```

(Use `win32-arm64` instead of `win32-x64` if you're on Windows ARM.)

### cmd

```cmd
mkdir "node_modules\.pnpm\better-sqlite3@12.10.0\node_modules\better-sqlite3\build\Release"
copy /Y "prebuilt-binaries\better-sqlite3\win32-x64\better_sqlite3.node" "node_modules\.pnpm\better-sqlite3@12.10.0\node_modules\better-sqlite3\build\Release\better_sqlite3.node"
```

## Verify

```bash
node -e "const D=require('better-sqlite3'); const db=new D(':memory:'); console.log('better-sqlite3 OK:', db.prepare('select 1 as ok').get())"
```

Then `pnpm dev` should start cleanly.

## Notes

- The destination path is pinned to `better-sqlite3@12.10.0`. If that version
  changes (lockfile bump), the `.pnpm` folder name changes too — re-copy into
  the new path, or update the version in the commands above.
- `pnpm` v10 skips native build scripts by default, but that doesn't matter
  here: we're supplying the compiled binary directly, so nothing needs to run.
- If you ever switch the env to a different OS/arch or Node major, grab the
  matching asset from
  `https://github.com/WiseLibs/better-sqlite3/releases/tag/v12.10.0`
  (file name pattern `better-sqlite3-v12.10.0-node-v<ABI>-<platform>-<arch>.tar.gz`,
  ABI 137 = Node 24) — it extracts to `build/Release/better_sqlite3.node`.
