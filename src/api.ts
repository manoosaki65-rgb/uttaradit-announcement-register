async function request(method: string, url: string, body?: unknown) {
 const r = await fetch(url, {method, credentials:'same-origin', headers:{'Content-Type':'application/json'}, ...(body !== undefined ? {body:JSON.stringify(body)} : {})});
 const data = await r.json();
 if (!r.ok) throw {response:{data}};
 return {data};
}
export const api = {get:(u:string)=>request('GET',u), post:(u:string,b:unknown)=>request('POST',u,b), put:(u:string,b:unknown)=>request('PUT',u,b), delete:(u:string)=>request('DELETE',u)};
function editorPassword(): Promise<string | null> {
 return new Promise(resolve => {
  const dialog = document.createElement('dialog');
  dialog.setAttribute('aria-label','เข้าสู่ระบบผู้แก้ไข');
  dialog.style.cssText='border:1px solid #cbd5e1;border-radius:16px;padding:24px;width:min(420px,90vw)';
  const form=document.createElement('form');
  const label=document.createElement('label'); label.textContent='รหัสผู้แก้ไข';
  const input=document.createElement('input'); input.type='password'; input.required=true; input.autocomplete='current-password';
  input.style.cssText='display:block;width:100%;padding:12px;margin:12px 0;border:1px solid #cbd5e1;border-radius:8px';
  label.append(input);
  const submit=document.createElement('button');submit.type='submit';submit.textContent='เข้าสู่ระบบ';submit.className='primaryButton';
  const cancel=document.createElement('button');cancel.type='button';cancel.textContent='ยกเลิก';cancel.className='cancelButton';cancel.style.marginLeft='8px';
  const finish=(value:string|null)=>{dialog.close();dialog.remove();resolve(value);};
  form.addEventListener('submit',event=>{event.preventDefault();finish(input.value);});
  cancel.addEventListener('click',()=>finish(null));
  dialog.addEventListener('cancel',event=>{event.preventDefault();finish(null);});
  form.append(label,submit,cancel);dialog.append(form);document.body.append(dialog);dialog.showModal();input.focus();
 });
}
export const auth = {
 isSignedIn:()=>true,
 getUser:async()=> (await request('GET','/api/session')).data.user,
 signIn:async()=> {const password=await editorPassword(); if(password === null) throw {code:'popup_closed'}; const r=await request('POST','/api/session',{password}); return r.data;},
 signOut:async()=>{await request('DELETE','/api/session');}
};

