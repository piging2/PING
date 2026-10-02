cd /home/nolan/projects/ping
echo "=== grep buildRenderContext ==="
grep -rl "buildRenderContext" src --include="*.ts" --include="*.tsx" 2>/dev/null | head -20
echo "=== grep generateSiteSpec ==="
grep -rl "export function generateSiteSpec\|export async function generateSiteSpec\|export const generateSiteSpec" src --include="*.ts" 2>/dev/null | head
echo "=== grep validateSiteSpec ==="
grep -rl "export function validateSiteSpec\|export async function validateSiteSpec\|export const validateSiteSpec" src --include="*.ts" 2>/dev/null | head
