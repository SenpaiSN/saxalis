#!/usr/bin/env node
const fs = require('fs');
const { SourceMapConsumer } = require('source-map');

async function mapPos(mapPath, line, column){
  const raw = fs.readFileSync(mapPath, 'utf8');
  const parsed = JSON.parse(raw);
  const consumer = await new SourceMapConsumer(parsed);
  const pos = consumer.originalPositionFor({ line: Number(line), column: Number(column) });
  console.log(`Bundle ${mapPath} -> ${line}:${column} => ${pos.source}:${pos.line}:${pos.column} (${pos.name || '-'})`);
  consumer.destroy();
}

async function main(){
  const [,, mapFile, line, column] = process.argv;
  if(!mapFile || !line || !column){
    console.error('Usage: node map_stack.cjs <mapFile> <line> <column>');
    process.exit(2);
  }
  await mapPos(mapFile, line, column);
}

main().catch(err=>{console.error(err);process.exit(1);});