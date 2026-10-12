'use strict';
const path = require('node:path');
const vscode = require('vscode');
const { TARGETS, buildPlan, installPlan } = require('./installer');
const REPO = 'https://github.com/FUSIONIFY-ID/autogopay-payment-gateway';
const PROMPT = 'Gunakan skill autogopay-payment-gateway untuk memasang QRIS AutoGoPay di proyek ini. Ikuti stack dan database yang sudah ada. Tambahkan konfigurasi backend, penyimpanan transaksi, pengecekan pembayaran, webhook terverifikasi, dan pencegahan proses ganda. Jalankan pemeriksaan dan jelaskan langkah dashboard yang masih perlu saya isi.';
class WelcomeProvider {
  getTreeItem(item) { return item; }
  getChildren() {
    return [
      ['Pasang skill ke proyek', 'autogopay.installSkill', 'cloud-download'],
      ['Salin prompt integrasi AI', 'autogopay.copyPrompt', 'copy'],
      ['Buka panduan pemasangan', 'autogopay.openGuide', 'book'],
      ['Buka dokumentasi AutoGoPay', 'autogopay.openDocs', 'link-external'],
    ].map(([label,command,icon]) => {
      const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);
      item.command = { command, title: label }; item.iconPath = new vscode.ThemeIcon(icon); return item;
    });
  }
}
function activate(context) {
  const report = handler => async () => { try { await handler(); } catch { vscode.window.showErrorMessage('AutoGoPay: pemasangan gagal. Pastikan folder dapat ditulis, tidak memakai symlink pada folder target, dan file skill tidak berubah selama pemasangan.'); } };
  context.subscriptions.push(vscode.window.registerTreeDataProvider('autogopayGettingStarted', new WelcomeProvider()));
  context.subscriptions.push(vscode.commands.registerCommand('autogopay.installSkill', report(async () => {
    if (!vscode.workspace.isTrusted) return vscode.window.showWarningMessage('Buka proyek sebagai trusted workspace sebelum memasang skill.');
    const folders = vscode.workspace.workspaceFolders || [];
    if (!folders.length) return vscode.window.showInformationMessage('Buka folder proyek terlebih dahulu, lalu jalankan AutoGoPay: Pasang Skill.');
    let folder = folders[0];
    if (folders.length > 1) {
      const selection = await vscode.window.showQuickPick(folders.map(f => ({ label: f.name, folder: f })), { title: 'Pilih proyek untuk AutoGoPay' });
      if (!selection) return; folder = selection.folder;
    }
    if (folder.uri.scheme !== 'file') return vscode.window.showWarningMessage('Installer ini membutuhkan workspace dengan filesystem lokal pada extension host.');
    const choices = await vscode.window.showQuickPick(Object.entries(TARGETS).map(([id,target]) => ({ label: target.label, description: target.directory, id })), {
      title: 'Pasang AutoGoPay untuk AI yang kamu gunakan', canPickMany: true,
    });
    if (!choices?.length) return;
    const bundle = path.join(context.extensionPath, 'skill-bundle');
    const plan = await buildPlan(folder.uri.fsPath, bundle, choices.map(x => x.id));
    const changed = plan.operations.filter(x => x.state === 'changed').length;
    let overwrite = false;
    if (changed) {
      overwrite = (await vscode.window.showWarningMessage(`${changed} file skill yang sudah ada berbeda. Timpa dengan versi ${plan.version}? Simpan perubahan pribadi sebelum melanjutkan.`, { modal: true }, 'Timpa skill')) === 'Timpa skill';
      if (!overwrite) return;
    }
    const result = await installPlan(plan, { overwrite });
    vscode.window.showInformationMessage(`AutoGoPay skill ${plan.version} siap: ${result.written} file dipasang, ${result.unchanged} tidak berubah. Mulai sesi AI baru lalu gunakan prompt integrasi.`);
  })));
  context.subscriptions.push(vscode.commands.registerCommand('autogopay.copyPrompt', async () => {
    await vscode.env.clipboard.writeText(PROMPT);
    vscode.window.showInformationMessage('Prompt AutoGoPay disalin. Tempel ke AI coding agent di proyekmu.');
  }));
  context.subscriptions.push(vscode.commands.registerCommand('autogopay.openGuide', () => vscode.env.openExternal(vscode.Uri.parse(REPO+'/blob/main/docs/vscode-extension.md'))));
  context.subscriptions.push(vscode.commands.registerCommand('autogopay.openDocs', () => vscode.env.openExternal(vscode.Uri.parse('https://autogopay.site/docs'))));
}
module.exports = { activate, WelcomeProvider, PROMPT };
