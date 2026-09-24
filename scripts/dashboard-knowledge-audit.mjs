import { writeFileSync } from 'node:fs';
import { buildKnowledgeSyncReport, renderKnowledgeSyncReport } from '../lib/dashboard-knowledge-sync.mjs';

const report = buildKnowledgeSyncReport({ dashboardRoot: process.argv[2] || 'configured dashboard evidence root' });
writeFileSync('docs/dashboard-knowledge-sync.md', renderKnowledgeSyncReport(report));
console.log(`Dashboard knowledge sync report written: ${report.publishedArticleCount} published articles`);
