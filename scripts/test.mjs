import ts from "typescript";
import {spawnSync} from "node:child_process";
import {mkdirSync,readFileSync,writeFileSync} from "node:fs";
import {dirname} from "node:path";
const files=["tests/market.test.ts","lib/analysis.ts","lib/model.ts","lib/sample.ts","lib/verticals.ts","lib/providers/types.ts","lib/providers/google.ts","lib/server/rate-limit.ts","lib/server/runtime.ts"];
for(const file of files){const target="work/test-build/"+file.replace(/\.ts$/,".js");mkdirSync(dirname(target),{recursive:true});const source=readFileSync(file,"utf8");const output=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/from (["'])(\.{1,2}\/[^"']+)\1/g,(_,quote,path)=>`from ${quote}${path}.js${quote}`);writeFileSync(target,output);}
const result=spawnSync(process.execPath,["--test","work/test-build/tests/market.test.js"],{stdio:"inherit"});process.exitCode=result.status||0;
