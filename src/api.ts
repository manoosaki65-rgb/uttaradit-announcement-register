async function request(method: string, url: string, body?: unknown) {
 const r = await fetch(url, {method, credentials:'same-origin', headers:{'Content-Type':'application/json'}, ...(body !== undefined ? {body:JSON.stringify(body)} : {})});
 const data = await r.json();
 if (!r.ok) throw {response:{data}};
 return {data};
}
export const api = {get:(u:string)=>request('GET',u), post:(u:string,b:unknown)=>request('POST',u,b), put:(u:string,b:unknown)=>request('PUT',u,b), delete:(u:string)=>request('DELETE',u)};

