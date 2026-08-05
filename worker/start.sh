#!/bin/bash

# ═══════════════════════════════════════════════════
# 🛡️  KAVACH WORKER STARTUP SCRIPT
# ═══════════════════════════════════════════════════

echo "🛡️  KAVACH Worker Startup"
echo "════════════════════════"
echo ""

# ── Check Ollama ──
echo "🔍 Checking Ollama..."
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
  echo "⚡ Starting Ollama..."
  ollama serve &
  sleep 3
  echo "✅ Ollama started"
else
  echo "✅ Ollama already running"
fi
echo ""

# ── Check Model ──
echo "🔍 Checking Qwen 2.5 Coder 14B model..."
if ! ollama list 2>/dev/null | grep -q "qwen2.5-coder:14b"; then
  echo "⬇️  Pulling Qwen 2.5 Coder 14B (this may take a while)..."
  ollama pull qwen2.5-coder:14b
  echo "✅ Model downloaded"
else
  echo "✅ Model already available"
fi
echo ""

# ── Check Semgrep ──
echo "🔍 Checking Semgrep..."
if ! command -v semgrep &> /dev/null; then
  echo "⬇️  Installing Semgrep..."
  pip3 install semgrep
  echo "✅ Semgrep installed"
else
  echo "✅ Semgrep already installed"
fi
echo ""

# ── Check Gitleaks ──
echo "🔍 Checking Gitleaks..."
if ! command -v gitleaks &> /dev/null; then
  echo "⬇️  Installing Gitleaks..."
  brew install gitleaks
  echo "✅ Gitleaks installed"
else
  echo "✅ Gitleaks already installed"
fi
echo ""

# ── Check Node Dependencies ──
echo "🔍 Checking worker dependencies..."
cd "$(dirname "$0")"
if [ ! -d "node_modules" ]; then
  echo "⬇️  Installing worker dependencies..."
  npm install
  echo "✅ Dependencies installed"
else
  echo "✅ Dependencies present"
fi
echo ""

# ── All Good! Start Worker ──
echo "════════════════════════"
echo "✨ All dependencies ready!"
echo "🚀 Starting KAVACH Worker..."
echo "════════════════════════"
echo ""

npx ts-node index.ts
