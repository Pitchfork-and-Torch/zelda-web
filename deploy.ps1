# Deploy zelda.jonbailey.xyz to Cloudflare Pages.
# Refuses to ship a cartridge file.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Public = Join-Path $Root "public"
$Project = "zelda-jonbailey"
$Domain = "zelda.jonbailey.xyz"

if (-not (Test-Path (Join-Path $Public "index.html"))) {
  Write-Error "Missing public/index.html"
}
if (-not (Test-Path (Join-Path $Public "og.jpg"))) {
  Write-Error "Missing public/og.jpg - run scripts/generate_og_card.py first"
}
if (-not (Test-Path (Join-Path $Public "player.js"))) {
  Write-Error "Missing public/player.js"
}

$roms = Get-ChildItem -Path $Public -Recurse -File -Include *.sfc,*.smc,*.fig,*.swc,*.gd3,*.gd7,*.bsx,*.swc
if ($roms) {
  Write-Error "Refusing to deploy. Cartridge files are in public/."
}

$js = Get-Content -Raw -Path (Join-Path $Public "player.js")
if ($js -match "EJS_gameUrl\s*=\s*['\`"][^'`"]+\.(sfc|smc|zip)") {
  Write-Error "Refusing to deploy. player.js points EJS_gameUrl at a cartridge path."
}

Write-Host "[DEPLOY] Zelda Pages project=$Project"
Push-Location $Root
try {
  $listed = npx --yes wrangler pages project list 2>&1 | Out-String
  if ($listed -notmatch [regex]::Escape($Project)) {
    Write-Host "[DEPLOY] creating Pages project $Project"
    npx --yes wrangler pages project create $Project --production-branch main
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }

  npx --yes wrangler pages deploy $Public --project-name=$Project --commit-dirty=true
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  Write-Host "[DEPLOY] attach custom domain $Domain if needed"
  py -3 -c @"
import json, os, urllib.request
from pathlib import Path
tok = os.environ.get('CLOUDFLARE_API_TOKEN') or ''
if not tok:
    p = Path(os.environ['USERPROFILE']) / '.grok' / 'secrets' / 'cloudflare_full_token.txt'
    if p.exists():
        tok = p.read_text(encoding='utf-8').strip()
if not tok:
    print('no token, domain step skipped')
    raise SystemExit(0)
acct = '75c71da18eeb801b3408c812742d6590'
headers = {'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json', 'User-Agent': 'zelda-deploy'}
def api(method, url, body=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return json.loads(raw)
        except Exception:
            return {'success': False, 'errors': [{'message': 'http ' + str(e.code)}]}
z = api('GET', 'https://api.cloudflare.com/client/v4/zones?name=jonbailey.xyz')
zid = z['result'][0]['id']
dom = api('POST', f'https://api.cloudflare.com/client/v4/accounts/{acct}/pages/projects/zelda-jonbailey/domains', {'name': 'zelda.jonbailey.xyz'})
print('pages-domain', 'ok' if dom.get('success') else dom.get('errors'))
ex = api('GET', f'https://api.cloudflare.com/client/v4/zones/{zid}/dns_records?name=zelda.jonbailey.xyz')
recs = ex.get('result') or []
need = True
for rec in recs:
    if rec.get('type') == 'CNAME' and str(rec.get('content','')).rstrip('.') == 'zelda-jonbailey.pages.dev':
        need = False
        print('dns exists')
        break
if need:
    created = api('POST', f'https://api.cloudflare.com/client/v4/zones/{zid}/dns_records', {'type':'CNAME','name':'zelda','content':'zelda-jonbailey.pages.dev','proxied':True,'ttl':1})
    print('dns created' if created.get('success') else created.get('errors'))
"@
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Site:    https://$Domain/"
Write-Host "Preview: https://$Project.pages.dev/"
Write-Host "Source:  $Root"
