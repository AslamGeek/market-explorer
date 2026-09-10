const os=require('node:os');
try {os.userInfo();} catch {os.userInfo=()=>({username:process.env.USERNAME||'local',homedir:os.homedir(),uid:-1,gid:-1,shell:null});require('node:module').syncBuiltinESMExports();}
