/**
 * Fix: directly apply Figma CSS enhancements to theme.css
 */
const fs = require('fs');
const path = require('path');

const cssPath = path.resolve(__dirname, '..', 'src', 'renderer', 'src', 'assets', 'css', 'theme.css');

let css = fs.readFileSync(cssPath, 'utf-8');

// Remove any test artifacts
css = css.replace(/\/\* TEST.*?\*\//g, '');

const enhancements = `

/* ============================================================
   الأنماط المضافة من تحليل Figma Mockups (POA)
   ============================================================ */

.glass-card-premium {
  background: var(--glass-bg) !important;
  backdrop-filter: var(--glass-blur) !important;
  -webkit-backdrop-filter: var(--glass-blur) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 24px !important;
  box-shadow: var(--shadow-premium) !important;
  transition: var(--transition-premium);
}

.glass-dialog {
  background: rgba(15, 23, 42, 0.95) !important;
  backdrop-filter: blur(25px) !important;
  -webkit-backdrop-filter: blur(25px) !important;
  border: 1px solid rgba(233, 195, 73, 0.25) !important;
  border-radius: 24px !important;
}

[data-theme='light'] .glass-dialog {
  background: rgba(255, 255, 255, 0.95) !important;
  border-color: rgba(233, 195, 73, 0.2) !important;
}

.glass-dialog-header {
  background: rgba(0, 0, 0, 0.2) !important;
  border-bottom: 1px solid rgba(233, 195, 73, 0.15) !important;
}

.glass-dialog-footer {
  background: rgba(0, 0, 0, 0.2) !important;
  border-top: 1px solid rgba(233, 195, 73, 0.15) !important;
}

[data-theme='light'] .glass-dialog-header,
[data-theme='light'] .glass-dialog-footer {
  background: rgba(0, 0, 0, 0.03) !important;
}

.gold-field {
  background: rgba(0, 0, 0, 0.4) !important;
  border-radius: 14px !important;
  border: 1px solid rgba(233, 195, 73, 0.25) !important;
  transition: all 0.3s ease;
}

[data-theme='light'] .gold-field {
  background: rgba(255, 255, 255, 0.8) !important;
  border-color: rgba(233, 195, 73, 0.3) !important;
}

[data-theme='light'] .gold-field input,
[data-theme='light'] .gold-field .v-field__input {
  color: #000000 !important;
}

.btn-gold-outline {
  background: transparent !important;
  color: var(--gold) !important;
  border: 1px solid rgba(233, 195, 73, 0.6) !important;
  border-radius: 12px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
  transition: all 0.3s ease !important;
}

.btn-gold-outline:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15) !important;
  border-color: rgba(233, 195, 73, 0.8) !important;
  background: rgba(233, 195, 73, 0.05) !important;
}

.preview-box {
  background: rgba(0, 0, 0, 0.3) !important;
  border: 1px solid rgba(233, 195, 73, 0.15) !important;
  border-radius: 12px;
  color: #ffffff !important;
}

[data-theme='light'] .preview-box {
  background: rgba(255, 255, 255, 0.5) !important;
  color: #000000 !important;
}

.glass-tabs {
  background: rgba(255, 255, 255, 0.02) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(233, 195, 73, 0.15) !important;
  border-radius: 14px !important;
  overflow: hidden;
}

.glass-tab-active {
  background: rgba(233, 195, 73, 0.15) !important;
  border-bottom: 2px solid #e9c349 !important;
  color: #e9c349 !important;
}

.search-field {
  border-radius: 16px !important;
  background: rgba(255, 255, 255, 0.03) !important;
  border: 1px solid rgba(233, 195, 73, 0.15) !important;
  transition: all 0.3s ease;
}

.search-field.v-field--focused {
  border-color: rgba(233, 195, 73, 0.6) !important;
  background: rgba(255, 255, 255, 0.06) !important;
}

[data-theme='light'] .search-field {
  background: rgba(255, 255, 255, 0.7) !important;
}

.mobile-poa-card {
  background: var(--glass-bg-soft) !important;
  backdrop-filter: var(--glass-blur) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 16px !important;
  overflow: hidden;
  transition: var(--transition-smooth);
}

.mobile-poa-card-header {
  background: rgba(0, 0, 0, 0.1) !important;
  border-bottom: 1px solid rgba(233, 195, 73, 0.1) !important;
}

.mobile-poa-card-footer {
  background: rgba(0, 0, 0, 0.15) !important;
  border-top: 1px solid rgba(233, 195, 73, 0.1) !important;
}

.divider-gold {
  border-color: rgba(233, 195, 73, 0.15) !important;
  opacity: 1 !important;
}

.status-badge {
  font-size: 0.7rem !important;
  font-weight: 900 !important;
  border-radius: 8px !important;
  padding: 2px 12px !important;
  letter-spacing: 0.02em !important;
}

.status-active {
  background: rgba(5, 150, 105, 0.15) !important;
  color: #059669 !important;
  border: 1px solid rgba(5, 150, 105, 0.3) !important;
}

.status-expired {
  background: rgba(220, 38, 38, 0.15) !important;
  color: #dc2626 !important;
  border: 1px solid rgba(220, 38, 38, 0.3) !important;
}

[data-theme='dark'] .status-active {
  background: rgba(52, 211, 153, 0.12) !important;
  color: #34d399 !important;
}

[data-theme='dark'] .status-expired {
  background: rgba(248, 113, 113, 0.12) !important;
  color: #f87171 !important;
}

.preview-label {
  color: var(--gold) !important;
  font-weight: 800 !important;
  font-size: 0.85rem !important;
  display: block;
  margin-bottom: 4px;
}

.preview-value {
  font-weight: 800 !important;
  font-size: 1rem !important;
  color: var(--text-primary) !important;
}

.party-card {
  background: var(--glass-bg-soft) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: 14px !important;
  padding: 16px !important;
  transition: var(--transition-smooth);
}

.party-card:hover {
  border-color: rgba(233, 195, 73, 0.4) !important;
}

.power-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(233, 195, 73, 0.06);
}

.power-item:last-child {
  border-bottom: none;
}

.power-bullet {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--gold);
  margin-top: 8px;
  flex-shrink: 0;
}

.icon-gold-bg {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--accent-alpha);
}

.section-title {
  font-weight: 900 !important;
  font-size: 1rem !important;
  color: var(--gold) !important;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.radius-card { border-radius: 14px !important; }
.radius-dialog { border-radius: 24px !important; }
.radius-btn { border-radius: 12px !important; }
.radius-field { border-radius: 14px !important; }

.card-lift {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card-lift:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 30px rgba(233, 195, 73, 0.1) !important;
}

.glow-gold {
  box-shadow: 0 0 20px rgba(233, 195, 73, 0.15);
}

.rtl-text { direction: rtl; text-align: right; }
.ltr-text { direction: ltr; text-align: left; display: inline-block; }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.page-enter { animation: fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
`;

if (css.includes('Figma Mockups')) {
  console.log('Enhancements already present in theme.css');
} else {
  css += '\n' + enhancements;
  fs.writeFileSync(cssPath, css, 'utf-8');
  console.log('✓ Successfully added Figma CSS enhancements to theme.css');
}
