# RAG 知识库系统启动脚本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    RAG 知识库系统启动脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = $PSScriptRoot

# 启动后端服务
Write-Host "[1/3] 启动后端服务 (端口: 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\backend'; npm run dev"
Start-Sleep -Seconds 2

# 启动前端应用
Write-Host "[2/3] 启动前端应用 (端口: 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\frontend'; npm run dev"
Start-Sleep -Seconds 1

# 启动后台管理系统
Write-Host "[3/3] 启动后台管理系统 (端口: 5174)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\admin'; npm run dev"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "    所有服务已启动！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "服务地址:" -ForegroundColor Cyan
Write-Host "  - 后端 API:      http://localhost:8000" -ForegroundColor White
Write-Host "  - 前端应用:      http://localhost:5173" -ForegroundColor White
Write-Host "  - 后台管理:      http://localhost:5174" -ForegroundColor White
Write-Host ""
Write-Host "管理员账号:" -ForegroundColor Cyan
Write-Host "  - 用户名: admin" -ForegroundColor White
Write-Host "  - 密码:   123123" -ForegroundColor White
Write-Host ""
Write-Host "提示: 确保 MongoDB 和 Ollama 服务已运行" -ForegroundColor Yellow
Write-Host ""
