#!/usr/bin/env node

// Script de inicialização para Render
// Este script tenta usar o arquivo compilado, se não existir, usa tsx

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando backend no Render...');

// Verificar se o arquivo compilado existe
const compiledFile = path.join(__dirname, 'dist', 'server.js');

if (fs.existsSync(compiledFile)) {
    console.log('✅ Usando arquivo compilado: dist/server.js');
    const child = spawn('node', [compiledFile], { stdio: 'inherit' });
    child.on('error', (err) => {
        console.error('❌ Erro ao executar arquivo compilado:', err);
        process.exit(1);
    });
} else {
    console.log('⚠️  Arquivo compilado não encontrado, usando tsx...');
    const child = spawn('npx', ['tsx', 'src/server.ts'], { stdio: 'inherit' });
    child.on('error', (err) => {
        console.error('❌ Erro ao executar tsx:', err);
        console.log('🔄 Tentando com node diretamente...');
        
        // Fallback: tentar executar com node diretamente
        const fallback = spawn('node', ['-r', 'tsx/register', 'src/server.ts'], { stdio: 'inherit' });
        fallback.on('error', (fallbackErr) => {
            console.error('❌ Erro no fallback:', fallbackErr);
            process.exit(1);
        });
    });
}
