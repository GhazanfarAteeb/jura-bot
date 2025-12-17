// Command Verification Script
// Run with: node verify-commands.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commandsDir = path.join(__dirname, 'src', 'commands');
const allCommands = [];
const allAliases = new Map();
const duplicateNames = [];
const duplicateAliases = [];
const missingFields = [];

console.log('🔍 Verifying RAPHAEL Commands...\n');

// Recursively find all command files
function findCommandFiles(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findCommandFiles(filePath);
    } else if (file.endsWith('.js')) {
      allCommands.push(filePath);
    }
  }
}

// Check for required fields
function verifyCommand(cmd, filePath) {
  const required = ['name', 'description', 'execute'];
  const missing = [];

  for (const field of required) {
    if (!cmd[field]) {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    missingFields.push({
      file: path.relative(__dirname, filePath),
      missing: missing
    });
  }
}

// Find command files
findCommandFiles(commandsDir);

console.log(`📁 Found ${allCommands.length} command files\n`);

// Track command names and aliases
const commandNames = new Map();
const commandsByCategory = {};

// Load and verify each command
for (const cmdPath of allCommands) {
  try {
    const module = await import(cmdPath);
    const cmd = module.default;

    if (!cmd) continue;

    // Verify required fields
    verifyCommand(cmd, cmdPath);

    const category = path.basename(path.dirname(cmdPath));
    if (!commandsByCategory[category]) {
      commandsByCategory[category] = [];
    }
    commandsByCategory[category].push(cmd.name || 'unnamed');

    // Check for duplicate command names
    if (commandNames.has(cmd.name)) {
      duplicateNames.push({
        name: cmd.name,
        files: [commandNames.get(cmd.name), path.relative(__dirname, cmdPath)]
      });
    } else {
      commandNames.set(cmd.name, path.relative(__dirname, cmdPath));
    }

    // Check for duplicate aliases
    if (cmd.aliases) {
      for (const alias of cmd.aliases) {
        if (allAliases.has(alias)) {
          duplicateAliases.push({
            alias: alias,
            commands: [allAliases.get(alias), cmd.name]
          });
        } else {
          allAliases.set(alias, cmd.name);
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error loading ${cmdPath}:`, error.message);
  }
}

// Display results
console.log('📊 Command Summary by Category:\n');
for (const [category, commands] of Object.entries(commandsByCategory)) {
  console.log(`  ${category}: ${commands.length} commands`);
  console.log(`    ${commands.join(', ')}\n`);
}

console.log(`\n✅ Total Commands: ${commandNames.size}`);
console.log(`✅ Total Aliases: ${allAliases.size}\n`);

// Check for issues
let hasIssues = false;

if (duplicateNames.length > 0) {
  hasIssues = true;
  console.log('⚠️  DUPLICATE COMMAND NAMES FOUND:');
  for (const dup of duplicateNames) {
    console.log(`   - "${dup.name}" in:`);
    for (const file of dup.files) {
      console.log(`     • ${file}`);
    }
  }
  console.log('');
}

if (duplicateAliases.length > 0) {
  hasIssues = true;
  console.log('⚠️  DUPLICATE ALIASES FOUND:');
  for (const dup of duplicateAliases) {
    console.log(`   - Alias "${dup.alias}" used by:`);
    for (const cmd of dup.commands) {
      console.log(`     • ${cmd}`);
    }
  }
  console.log('');
}

if (missingFields.length > 0) {
  hasIssues = true;
  console.log('⚠️  COMMANDS WITH MISSING REQUIRED FIELDS:');
  for (const issue of missingFields) {
    console.log(`   - ${issue.file}`);
    console.log(`     Missing: ${issue.missing.join(', ')}`);
  }
  console.log('');
}

if (!hasIssues) {
  console.log('✅ No issues found! All commands are properly configured.\n');
} else {
  console.log('⚠️  Issues found. Please review and fix the above problems.\n');
}

// Check for potential naming conflicts
console.log('🔍 Checking for potential naming conflicts...\n');
const similarNames = [];
const nameArray = Array.from(commandNames.keys());

for (let i = 0; i < nameArray.length; i++) {
  for (let j = i + 1; j < nameArray.length; j++) {
    const name1 = nameArray[i];
    const name2 = nameArray[j];

    // Check if names are very similar
    if (name1.includes(name2) || name2.includes(name1)) {
      similarNames.push([name1, name2]);
    }
  }
}

if (similarNames.length > 0) {
  console.log('ℹ️  Similar command names (verify if intentional):');
  for (const [name1, name2] of similarNames) {
    console.log(`   - "${name1}" and "${name2}"`);
  }
  console.log('');
}

// Category recommendations
console.log('📋 Category Command Count:');
const sortedCategories = Object.entries(commandsByCategory).sort((a, b) => b[1].length - a[1].length);
for (const [category, commands] of sortedCategories) {
  const emoji = category === 'music' ? '🎵' :
    category === 'economy' ? '💰' :
      category === 'moderation' ? '🛡️' :
        category === 'config' ? '⚙️' :
          category === 'community' ? '🎉' :
            category === 'info' ? 'ℹ️' : '🔧';
  console.log(`  ${emoji} ${category.padEnd(15)} ${commands.length} commands`);
}

console.log('\n✅ Verification complete!\n');

// Export summary
const summary = {
  totalCommands: commandNames.size,
  totalAliases: allAliases.size,
  categories: Object.keys(commandsByCategory).length,
  commandsByCategory: Object.fromEntries(
    Object.entries(commandsByCategory).map(([k, v]) => [k, v.length])
  ),
  issues: {
    duplicateNames: duplicateNames.length,
    duplicateAliases: duplicateAliases.length,
    missingFields: missingFields.length
  }
};

fs.writeFileSync('command-verification-summary.json', JSON.stringify(summary, null, 2));
console.log('📄 Summary saved to command-verification-summary.json\n');
