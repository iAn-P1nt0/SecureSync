import { findAlternatives } from '../src/index.js';

async function main() {
  const packageName = process.argv[2] || 'moment';

  console.log(`Finding alternatives for ${packageName}...\n`);

  const alternatives = await findAlternatives(packageName, {
    zeroVulnerabilities: true,
    minDownloads: 10000,
    minCompatibility: 50,
  });

  if (alternatives.length === 0) {
    console.log('No suitable alternatives found.');
    return;
  }

  console.log(`Found ${alternatives.length} alternatives:\n`);

  for (let i = 0; i < alternatives.length; i++) {
    const alt = alternatives[i];
    console.log(`${i + 1}. ${alt.name} (Score: ${alt.score}/100)`);
    console.log(`   ${alt.description}`);
    console.log(`   Downloads: ${formatNumber(alt.downloads)}/week`);
    console.log(`   Last publish: ${formatDate(alt.lastPublish)}`);
    console.log(`   Stars: ${formatNumber(alt.stars)}`);
    console.log(`   Vulnerabilities: ${alt.vulnerabilities}`);
    console.log(`   API Compatibility: ${alt.compatibility}%`);
    console.log(`   Migration Effort: ${alt.migrationEffort.toUpperCase()}`);
    console.log('');
  }
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'today';
  } else if (diffDays === 1) {
    return 'yesterday';
  } else if (diffDays < 30) {
    return `${diffDays} days ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }
}

main().catch(console.error);
