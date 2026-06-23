# setup.ps1 — memwin one-command setup for Windows
#
# Usage:
#   .\setup.ps1                          # Interactive mode (auto-detect Obsidian vault)
#   .\setup.ps1 -VaultPath "D:\my-vault" # Non-interactive (custom path)
#   .\setup.ps1 -DryRun                  # Preview without changes
#
# What it does:
#   1. Checks Node.js >= 18
#   2. Auto-detects Obsidian vault (or asks for path)
#   3. Creates memwin/ subdirectory inside the vault
#   4. Copies templates (never overwrites existing files)
#   5. Sets OBSIDIAN_VAULT user environment variable
#   6. Merges hooks into ~/.claude/settings.json (idempotent, creates backup)
#   7. Prints next steps

param(
    [string]$VaultPath = "",
    [switch]$DryRun = $false
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = $scriptDir

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  memwin — Claude Code memory for Windows" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# Step 1: Check prerequisites
# ============================================================
Write-Host "[1/7] Checking prerequisites..." -ForegroundColor Cyan

# Node.js
try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Node.js not found" }
    $versionNum = [int]($nodeVersion -replace 'v','' -split '\.')[0]
    if ($versionNum -lt 18) { throw "Node.js >= 18 required, got $nodeVersion" }
    Write-Host "  Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Node.js 18+ is required. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Check if settings.json exists
$settingsPath = "$env:USERPROFILE\.claude\settings.json"
if (-not (Test-Path $settingsPath)) {
    Write-Host "  WARNING: $settingsPath not found — creating a new one" -ForegroundColor Yellow
    $null = New-Item -ItemType Directory -Path (Split-Path $settingsPath) -Force
    "{}" | Out-File -FilePath $settingsPath -Encoding utf8
}
Write-Host "  settings.json found" -ForegroundColor Green

Write-Host "  All prerequisites met." -ForegroundColor Green
Write-Host ""

# ============================================================
# Step 2: Determine vault path (auto-detect Obsidian)
# ============================================================
Write-Host "[2/7] Configuring vault location..." -ForegroundColor Cyan

# Try to auto-detect Obsidian vault
$obsidianVault = $null
$obsidianJsonPaths = @(
    "$env:APPDATA\obsidian\obsidian.json",
    "$env:LOCALAPPDATA\obsidian\Obsidian\obsidian.json"
)
foreach ($cfgPath in $obsidianJsonPaths) {
    if (Test-Path $cfgPath) {
        try {
            $obsidianCfg = Get-Content $cfgPath -Raw -Encoding utf8 | ConvertFrom-Json
            if ($obsidianCfg.vaults -and $obsidianCfg.vaults.Count -gt 0) {
                $firstVault = $obsidianCfg.vaults[0]
                if ($firstVault.path) { $obsidianVault = $firstVault.path }
            }
        } catch { }
    }
}
if (-not $obsidianVault) {
    # Check common default locations
    $commonPaths = @(
        "$env:USERPROFILE\Documents\Obsidian Vault",
        "$env:USERPROFILE\Documents\Obsidian",
        "$env:USERPROFILE\Obsidian"
    )
    foreach ($p in $commonPaths) {
        if (Test-Path $p) { $obsidianVault = $p; break }
    }
}

if (-not $VaultPath) {
    if ($obsidianVault) {
        $defaultPath = "$obsidianVault\memwin"
        Write-Host "  Detected Obsidian vault: $obsidianVault" -ForegroundColor Green
    } else {
        $defaultPath = "$env:USERPROFILE\memwin-vault"
        Write-Host "  No Obsidian vault detected. Using standalone vault." -ForegroundColor Yellow
    }
    $userInput = Read-Host "  Vault path [$defaultPath]"
    if ($userInput.Trim() -eq "") {
        $VaultPath = $defaultPath
    } else {
        $VaultPath = $userInput.Trim()
    }
}

# Normalize to absolute path
$VaultPath = [System.IO.Path]::GetFullPath($VaultPath)
Write-Host "  Vault: $VaultPath" -ForegroundColor Green

if ($DryRun) {
    Write-Host "  [DRY RUN] Would create directory structure here" -ForegroundColor Yellow
} else {
    # Validate path doesn't contain dangerous characters
    if ($VaultPath -match '[<>"|?*]') {
        Write-Host "  ERROR: Vault path contains invalid characters" -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# ============================================================
# Step 3: Create vault directory structure
# ============================================================
Write-Host "[3/7] Creating vault structure..." -ForegroundColor Cyan

$dirs = @(
    "$VaultPath\wiki\notes",
    "$VaultPath\wiki\concepts",
    "$VaultPath\wiki\decisions",
    "$VaultPath\wiki\methods",
    "$VaultPath\raw"
)

foreach ($dir in $dirs) {
    if ($DryRun) {
        Write-Host "  [DRY RUN] Would create: $dir" -ForegroundColor Yellow
    } else {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Host "  Created: $dir" -ForegroundColor Green
        } else {
            Write-Host "  Exists:  $dir" -ForegroundColor Gray
        }
    }
}
Write-Host ""

# ============================================================
# Step 4: Copy templates (never overwrite existing files)
# ============================================================
Write-Host "[4/7] Copying templates..." -ForegroundColor Cyan

$templateDir = "$repoRoot\templates\vault"
$filesToCopy = @(
    @{Src="CLAUDE.md"; Dst="$VaultPath\CLAUDE.md"},
    @{Src=".gitignore"; Dst="$VaultPath\.gitignore"},
    @{Src="wiki\index.md"; Dst="$VaultPath\wiki\index.md"},
    @{Src="wiki\hot.md"; Dst="$VaultPath\wiki\hot.md"},
    @{Src="wiki\log.md"; Dst="$VaultPath\wiki\log.md"}
)

foreach ($f in $filesToCopy) {
    $src = Join-Path $templateDir $f.Src
    $dst = $f.Dst
    if ($DryRun) {
        if (Test-Path $dst) {
            Write-Host "  [DRY RUN] Would skip (exists): $dst" -ForegroundColor Yellow
        } else {
            Write-Host "  [DRY RUN] Would copy: $($f.Src) -> $dst" -ForegroundColor Yellow
        }
    } else {
        if (Test-Path $dst) {
            Write-Host "  Skipped (exists): $dst" -ForegroundColor Gray
        } else {
            Copy-Item $src $dst
            Write-Host "  Copied: $($f.Src) -> $dst" -ForegroundColor Green
        }
    }
}
Write-Host ""

# ============================================================
# Step 5: Set OBSIDIAN_VAULT environment variable
# ============================================================
Write-Host "[5/7] Setting OBSIDIAN_VAULT environment variable..." -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "  [DRY RUN] Would set OBSIDIAN_VAULT=$VaultPath (User scope)" -ForegroundColor Yellow
} else {
    try {
        [Environment]::SetEnvironmentVariable("OBSIDIAN_VAULT", $VaultPath, "User")
        Write-Host "  Set OBSIDIAN_VAULT=$VaultPath (User scope)" -ForegroundColor Green
        Write-Host "  NOTE: Restart your terminal for this to take effect." -ForegroundColor Yellow
    } catch {
        Write-Host "  ERROR: Failed to set environment variable. Try running as Administrator." -ForegroundColor Red
        Write-Host "  You can manually set it: setx OBSIDIAN_VAULT `"$VaultPath`"" -ForegroundColor Yellow
    }
}
Write-Host ""

# ============================================================
# Step 6: Merge hooks into settings.json
# ============================================================
Write-Host "[6/7] Installing Claude Code hooks..." -ForegroundColor Cyan

$hookConfig = @{
    hooks = @{
        SessionStart = @(
            @{
                hooks = @(
                    @{
                        type = "command"
                        command = "node `"$repoRoot\hooks\note-taking-context.mjs`""
                    }
                )
            }
        )
        SessionEnd = @(
            @{
                hooks = @(
                    @{
                        type = "command"
                        command = "node `"$repoRoot\hooks\session-end-check.mjs`""
                    }
                )
            }
        )
    }
}

if ($DryRun) {
    $hookJson = $hookConfig | ConvertTo-Json -Depth 5
    Write-Host "  [DRY RUN] Would merge into settings.json:" -ForegroundColor Yellow
    Write-Host $hookJson
} else {
    # Read current settings
    $settings = Get-Content $settingsPath -Raw -Encoding utf8 | ConvertFrom-Json

    # Create backup
    $backupPath = "$settingsPath.memwin.bak"
    Copy-Item $settingsPath $backupPath
    Write-Host "  Backup created: $backupPath" -ForegroundColor Gray

    # Deep merge hooks: remove existing memwin hooks (matched by command path containing "memwin"),
    # then add new ones. Preserves existing non-memwin hooks.
    if (-not $settings.hooks) {
        $settings | Add-Member -MemberType NoteProperty -Name "hooks" -Value (@{}) -Force
    }

    # Ensure hook event arrays exist
    foreach ($event in @("SessionStart", "SessionEnd")) {
        if (-not $settings.hooks.$event) {
            $settings.hooks | Add-Member -MemberType NoteProperty -Name $event -Value (@()) -Force
        }
    }

    # Remove existing memwin hooks from each event
    foreach ($event in @("SessionStart", "SessionEnd")) {
        $newList = @()
        foreach ($entry in $settings.hooks.$event) {
            $keep = $true
            if ($entry.hooks) {
                foreach ($h in $entry.hooks) {
                    if ($h.command -and $h.command -match "memwin") {
                        $keep = $false
                        break
                    }
                }
            }
            if ($keep) { $newList += $entry }
        }
        $settings.hooks.$event = $newList
    }

    # Add new memwin hooks
    foreach ($event in @("SessionStart", "SessionEnd")) {
        $settings.hooks.$event += $hookConfig.hooks.$event
    }

    # Write back
    $settings | ConvertTo-Json -Depth 6 | Out-File -FilePath $settingsPath -Encoding utf8
    Write-Host "  Hooks installed into settings.json" -ForegroundColor Green
}
Write-Host ""

# ============================================================
# Done
# ============================================================
if ($DryRun) {
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  DRY RUN COMPLETE — No changes made." -ForegroundColor Yellow
    Write-Host "  Run without -DryRun to install." -ForegroundColor Yellow
    Write-Host "============================================" -ForegroundColor Cyan
} else {
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  memwin setup complete!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor White
    Write-Host "  1. Restart your terminal (or refresh env vars)" -ForegroundColor White
    Write-Host "  2. Start a new Claude Code session" -ForegroundColor White
    Write-Host "  3. Have a conversation — important notes auto-saved to Obsidian vault" -ForegroundColor White
    Write-Host "  4. Open Obsidian → notes appear under memwin/ folder" -ForegroundColor White
    Write-Host "  5. To uninstall: remove memwin hooks from $settingsPath" -ForegroundColor White
    Write-Host ""
}

Write-Host "Vault: $VaultPath" -ForegroundColor Gray
Write-Host "Hooks: $repoRoot\hooks\" -ForegroundColor Gray
Write-Host ""
