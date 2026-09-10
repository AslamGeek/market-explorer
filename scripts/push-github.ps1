param([switch]$CheckOnly)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$trustedProjectRoot = [IO.Path]::GetFullPath($projectRoot).Replace('\', '/')
$repository = 'https://github.com/AslamGeek/market-explorer.git'

function Invoke-Git {
    param([string]$Directory, [string[]]$GitArguments)
    # Windows PowerShell treats Git's normal stderr progress as error records.
    # Use the native exit code to determine success instead.
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        # The project may have been created by Codex's separate Windows account.
        # Trust only this exact project for this command; never alter global config.
        $output = & git -c http.sslBackend=openssl -c "safe.directory=$trustedProjectRoot" -C $Directory @GitArguments 2>&1
        $gitExitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($gitExitCode -ne 0) {
        throw "Git failed ($($GitArguments[0])): $($output -join [Environment]::NewLine)"
    }
    return $output
}

function Test-SourcePath {
    param([string]$RelativePath)
    if ($RelativePath -match '(^|/)(\.git|node_modules|\.next[^/]*|\.vinext|dist|out|work|outputs|\.data|\.wrangler|\.sites-runtime|\.vercel|\.codex|\.agents)(/|$)') { return $false }
    if ($RelativePath -match '(^|/)\.env' -and $RelativePath -ne '.env.example') { return $false }
    if ($RelativePath -match '\.(pem|key|pfx|p12|log|tsbuildinfo)$') { return $false }
    return $true
}

try {
    Get-Command git -ErrorAction Stop | Out-Null
    $gitRoot = (Invoke-Git $projectRoot @('rev-parse', '--show-toplevel') | Select-Object -Last 1).ToString()
    if ([IO.Path]::GetFullPath($gitRoot).TrimEnd('\', '/') -ne $projectRoot.TrimEnd('\', '/')) {
        throw 'Run this script from the Location Intelligence Explorer project, not a parent repository.'
    }

    # Respect .gitignore, then explicitly exclude private/runtime files even if tracked.
    $sourceFiles = @(Invoke-Git $projectRoot @('-c', 'core.quotepath=false', 'ls-files', '--cached', '--others', '--exclude-standard') |
        ForEach-Object { $_.ToString() } | Sort-Object -Unique |
        Where-Object { (Test-SourcePath $_) -and (Test-Path -LiteralPath (Join-Path $projectRoot $_) -PathType Leaf) })
    foreach ($required in @('package.json', 'next.config.ts', 'app/page.tsx', '.gitignore')) {
        if ($required -notin $sourceFiles) { throw "Required source file is missing: $required" }
    }
    foreach ($relativePath in $sourceFiles) {
        $content = [IO.File]::ReadAllText((Join-Path $projectRoot $relativePath))
        if ($content -match 'AIza[0-9A-Za-z_-]{35}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[0-9A-Za-z]{30,}') {
            throw "A possible credential was found in $relativePath. Remove it from source before pushing."
        }
    }
    Write-Output "Validated $($sourceFiles.Count) source files. Private configuration and generated files are excluded."
    if ($CheckOnly) {
        Write-Output 'Check complete. No network requests, commits, or pushes were made.'
        exit 0
    }

    # Running the CMD file is the user's authorization for this upload.
    # A fresh checkout preserves GitHub history without changing the local project history.
    $workRoot = Join-Path $projectRoot 'work'
    New-Item -ItemType Directory -Path $workRoot -Force | Out-Null
    $checkout = Join-Path $workRoot ('github-push-' + [guid]::NewGuid().ToString('N'))
    $env:GIT_TERMINAL_PROMPT = '0'
    Invoke-Git $projectRoot @('clone', '--quiet', '--single-branch', '--branch', 'main', $repository, $checkout) | Write-Output

    foreach ($relativePath in $sourceFiles) {
        $destination = Join-Path $checkout $relativePath
        New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
        Copy-Item -LiteralPath (Join-Path $projectRoot $relativePath) -Destination $destination -Force
    }
    # Overlay source files; files that exist only on GitHub are preserved.
    Invoke-Git $checkout @('add', '--all') | Write-Output
    $changes = @(Invoke-Git $checkout @('diff', '--cached', '--name-only'))
    if ($changes.Count -eq 0) {
        Write-Output 'GitHub already contains this source. Nothing to push.'
        exit 0
    }
    $authorName = (Invoke-Git $projectRoot @('config', '--get', 'user.name') | Select-Object -Last 1).ToString()
    $authorEmail = (Invoke-Git $projectRoot @('config', '--get', 'user.email') | Select-Object -Last 1).ToString()
    Invoke-Git $checkout @('-c', "user.name=$authorName", '-c', "user.email=$authorEmail", 'commit', '-m', ('Update Location Intelligence Explorer ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))) | Write-Output
    Invoke-Git $checkout @('push', 'origin', 'HEAD:main') | Write-Output
    Write-Output "SUCCESS: Source pushed to $repository"
} catch {
    Write-Output "PUSH FAILED: $($_.Exception.Message)"
    Write-Output 'No force push was attempted. If authentication failed, sign in with Git Credential Manager, then run push-to-github.cmd again.'
    exit 1
}
