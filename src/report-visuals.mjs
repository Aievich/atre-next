import {esc} from './lib.mjs';
import {renderSourceText} from './report-reading.mjs';

// Character ranges refer to the immutable original digital text. Only its display changes.
export function visualPageParts(page,manifest){
  const plan=manifest?.pages?.[page.page];if(!plan)return [{kind:'text',text:page.text}];
  const assets=new Map(manifest.items.filter(v=>v.page===page.page).map(v=>[v.id,v]));
  const texts=new Map();
  for(const run of plan.runs)if(run.visualId)texts.set(run.visualId,(texts.get(run.visualId)||'')+page.text.slice(run.start,run.end));
  const seen=new Set(),parts=[];
  for(const run of plan.runs){
    if(!run.visualId){const text=page.text.slice(run.start,run.end);if(parts.at(-1)?.kind==='text')parts.at(-1).text+=text;else parts.push({kind:'text',text});}
    else if(!seen.has(run.visualId)){seen.add(run.visualId);parts.push({kind:'visual',asset:assets.get(run.visualId),text:texts.get(run.visualId)});}
  }
  return parts;
}

export function renderVisualPage(page,manifest){
  return visualPageParts(page,manifest).map(part=>{
    if(part.kind==='text')return renderSourceText(part.text);
    const v=part.asset;
    return `<figure class="polymer-source-visual" id="polymer-${esc(v.id)}" data-source-visual="${esc(v.id)}"><a class="polymer-visual-zoom" href="${esc(v.image)}" target="_blank" rel="noopener" aria-label="Увеличить: ${esc(v.caption)}"><img src="${esc(v.image)}" width="${v.width}" height="${v.height}" loading="lazy" alt="${esc(v.caption)}. Оригинальное изображение из PDF, страница ${v.page}."></a><figcaption><span>${esc(v.caption)}</span><a href="${esc(v.sourceHref)}" target="_blank" rel="noopener">PDF, с. ${v.page}</a></figcaption><p class="polymer-zoom-hint">Нажмите на изображение для увеличения.</p><details class="polymer-visual-transcript"><summary>Текстовая расшифровка ${v.kind==='table'?'таблицы '+v.number:v.kind==='figure'?'рисунка '+v.number:'фрагмента оригинала'}</summary><div>${renderSourceText(part.text)}</div></details></figure>`;
  }).join('');
}
