import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';

const maxBytes = 8192;
const fields = {outlet:100,email:254,subject:120,question:900,deadline:100};
const consultingLimits = {kind:20,name:100,organization:120,email:254,subject:120,question:1800,deadline:100};
const reply = (res,status,body) => {
  res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(body));
};

function validateFields(body, limits, optional) {
  if (!body || typeof body!=='object' || Array.isArray(body)) return null;
  const clean = {};
  for (const [key,max] of Object.entries(limits)) {
    const value = typeof body[key]==='string' ? body[key].trim() : '';
    if ((!value && !optional.includes(key)) || value.length>max) return null;
    clean[key] = value;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email) ? clean : null;
}

export function pressFields(body) {
  return validateFields(body,fields,['deadline']);
}

export function consultingFields(body) {
  const data = validateFields(body,consultingLimits,['organization','deadline']);
  return data && ['question','consulting','research'].includes(data.kind) ? data : null;
}

export async function savePressRequest(inbox,fields) {
  const id = randomUUID();
  await mkdir(inbox,{recursive:true,mode:0o700});
  await writeFile(path.join(inbox,id+'.json'),JSON.stringify({id,receivedAt:new Date().toISOString(),...fields},null,2)+'\n',
    {encoding:'utf8',flag:'wx',mode:0o600});
  return id;
}

export async function handlePressRequest(req,res,inbox,validate=pressFields) {
  if (req.method!=='POST') {
    res.setHeader('Allow','POST');
    return reply(res,405,{error:'method'});
  }
  if (req.headers.origin && req.headers.origin!=='http://'+req.headers.host) return reply(res,403,{error:'origin'});
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||'')) return reply(res,415,{error:'format'});
  if (Number(req.headers['content-length'])>maxBytes) return reply(res,413,{error:'size'});
  let fields;
  try {
    let size=0;
    const chunks=[];
    for await (const chunk of req.iterator({destroyOnReturn:false})) {
      size += chunk.length;
      if (size>maxBytes) {req.resume();return reply(res,413,{error:'size'});}
      chunks.push(chunk);
    }
    fields=validate(JSON.parse(Buffer.concat(chunks).toString('utf8')));
  } catch {
    return reply(res,400,{error:'invalid'});
  }
  if (!fields) return reply(res,400,{error:'invalid'});
  try {
    const id=await savePressRequest(inbox,fields);
    return reply(res,201,{id});
  } catch {
    return reply(res,500,{error:'storage'});
  }
}
