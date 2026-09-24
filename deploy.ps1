$ErrorActionPreference = "Stop"

$repo = "https://github.com/gmilanezz/lalastorevip.git"
$cname = "lalastorevip.com.br"
$dist = Join-Path $PSScriptRoot "dist\lalastorevip\browser"

Write-Host "1/5 - Gerando build de producao..."
npm run build -- --configuration production --base-href /
if ($LASTEXITCODE -ne 0) { throw "Falha no build." }

if (-not (Test-Path $dist)) {
    throw "Pasta de build nao encontrada: $dist"
}

Write-Host "2/5 - Preparando CNAME..."
Set-Content -Path (Join-Path $dist "CNAME") -Value $cname -Encoding ascii

Write-Host "3/5 - Preparando repositorio temporario..."
Push-Location $dist
try {
    if (Test-Path ".git") { Remove-Item -Recurse -Force ".git" }

    git init
    if ($LASTEXITCODE -ne 0) { throw "Falha no git init." }

    git add .
    if ($LASTEXITCODE -ne 0) { throw "Falha no git add." }

    git commit -m "Deploy"
    if ($LASTEXITCODE -ne 0) { throw "Falha no git commit." }

    git remote add origin $repo
    if ($LASTEXITCODE -ne 0) { throw "Falha ao configurar origin." }

    Write-Host "4/5 - Publicando em gh-pages..."
    git push --force origin HEAD:gh-pages
    if ($LASTEXITCODE -ne 0) { throw "Falha no push para gh-pages." }
}
finally {
    Pop-Location
}

Write-Host "5/5 - Deploy concluido com sucesso."
