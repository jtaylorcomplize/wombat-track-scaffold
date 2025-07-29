#!/usr/bin/env tsx

import { readFileSync } from 'fs';
import { join } from 'path';

const modelPath = join(process.cwd(), 'canonical-db-model.json');
const model = JSON.parse(readFileSync(modelPath, 'utf8'));

console.log('🔧 High-Confidence Fillable Fields Found:\n');

let totalFillable = 0;

for (const db of model.databases) {
  const fillableFields = db.emptyFieldAnalysis.filter(f => f.fillable && f.confidenceLevel === 'high');
  
  if (fillableFields.length > 0) {
    console.log(`📊 Database: ${db.title}`);
    console.log(`   ID: ${db.id}`);
    console.log(`   Records: ${db.recordCount}`);
    
    for (const field of fillableFields) {
      console.log(`   🔧 Field: ${field.fieldName}`);
      console.log(`      Empty Count: ${field.emptyCount}`);
      console.log(`      Suggested Value: ${field.suggestedValue}`);
      console.log(`      Reasoning: ${field.reasoning}`);
      console.log(`      Confidence: ${field.confidenceLevel}\n`);
      totalFillable++;
    }
  }
}

// Also show medium confidence for reference
console.log('📋 Medium-Confidence Fields (for reference):\n');

for (const db of model.databases) {
  const mediumFields = db.emptyFieldAnalysis.filter(f => f.fillable && f.confidenceLevel === 'medium');
  
  if (mediumFields.length > 0) {
    console.log(`📊 Database: ${db.title}`);
    
    for (const field of mediumFields) {
      console.log(`   ⚠️  Field: ${field.fieldName} (${field.emptyCount} empty)`);
      console.log(`      Suggested: ${field.suggestedValue}`);
      console.log(`      Reasoning: ${field.reasoning}\n`);
    }
  }
}

console.log(`🎯 Total High-Confidence Fillable Fields: ${totalFillable}`);