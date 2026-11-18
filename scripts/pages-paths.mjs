export function rewriteAssetPaths(text,base){
 if(!/^\/[a-zA-Z0-9_-]+\/$/.test(base))throw Error('Expected /repository/ base path');
 return text.replace(/(?<=["'`(])\/(?:materials|covers|data|geo|brand|fonts|vendor)\//g,m=>base+m.slice(1))
  .replace(/((?:href|src)=["'])\/(?!\/)([^"']*)/g,(_,attr,value)=>attr+(('/'+value).startsWith(base)?'/'+value:base+value))
  .replaceAll("startsWith('/employee')","startsWith('"+base+"employee')");
}
