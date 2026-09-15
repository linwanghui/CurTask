const fs = require('fs');
async function call(name, args) {
  const response = await fetch('http://127.0.0.1:3000/mcp', {method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({jsonrpc:'2.0',id:Date.now(),method:'tools/call',params:{name,arguments:args}})});
  const json=await response.json();
  if(json.error) throw Error(JSON.stringify(json.error));
  const content=json.result.content?.find(c=>c.type==='text');
  const result=content?JSON.parse(content.text):json.result;
  if(result.success===false) throw Error(JSON.stringify(result));
  return result;
}
module.exports={call};
if(require.main===module)call(process.argv[2],JSON.parse(process.argv[3]||'{}')).then(x=>console.log(JSON.stringify(x))).catch(e=>{console.error(e);process.exitCode=1});
