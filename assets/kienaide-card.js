// Prepare PNG before the tap: native sharing must start inside the user's gesture.
(function(root){'use strict';
function create({make,change},platform=root){
 let epoch=0,ready=null,busy=false;
 const emit=(state,message='')=>change({state,message,ready:!!ready});
 function reset(){epoch++;ready=null;busy=false;emit('idle')}
 async function prepare(){
  if(busy)return;const token=++epoch;ready=null;busy=true;emit('preparing');
  try{
   const {canvas,...metadata}=make();
   const blob=await new Promise((resolve,reject)=>{canvas.toBlob(value=>value?resolve(value):reject(new Error('PNG unavailable')),'image/png')});
   if(token!==epoch)return;
   let file=null;try{if(typeof platform.File==='function')file=new platform.File([blob],metadata.filename,{type:'image/png'})}catch(_){}
   ready={...metadata,blob,file};emit('ready');
  }catch(_){if(token===epoch)emit('error','カードを作れませんでした。もう一度お試しください。')}
  finally{if(token===epoch)busy=false}
 }
 async function save(){
  if(busy)return;if(!ready)return prepare();
  const token=epoch,card=ready;busy=true;emit('saving');
  const current=()=>token===epoch;
  try{
   let canShare=false;
   try{canShare=!!(card.file&&typeof platform.navigator.share==='function'&&typeof platform.navigator.canShare==='function'&&platform.navigator.canShare({files:[card.file]}))}catch(_){}
   if(canShare){
    try{await platform.navigator.share({title:card.title,text:card.text,files:[card.file]});if(current())emit('ready','共有の操作を終えました。');return}
    catch(error){if(!current())return;if(error?.name==='AbortError'){emit('ready','共有を取り消しました。もう一度操作できます。');return}}
   }
   if(!current())return;
   const url=platform.URL.createObjectURL(card.blob);let anchor;
   try{anchor=platform.document.createElement('a');anchor.href=url;anchor.download=card.filename;platform.document.body.append(anchor);anchor.click()}
   finally{anchor?.remove();platform.setTimeout(()=>platform.URL.revokeObjectURL(url),30000)}
   if(current())emit('ready','画像のダウンロードを開始しました。');
  }catch(_){if(current())emit('error','保存を開始できませんでした。もう一度お試しください。')}
  finally{if(current())busy=false}
 }
 reset();return {reset,prepare,save};
}
root.KienaideCard={create};
})(typeof window!=='undefined'?window:globalThis);
