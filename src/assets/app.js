var $="readystatechange",L;function _(t=document){return L??=new Promise(e=>{let n=()=>{t.readyState==="complete"&&(e(),t.removeEventListener($,n))};t.addEventListener($,n),n()}),L}var T=t=>`color: ${t}; font-weight: bold;`,j="#f012be";function y({component:t,e,module:n,color:i}){if(typeof __DEV__=="boolean"&&!__DEV__)return;let s=e.type;typeof DEBUG_IGNORE=="object"&&DEBUG_IGNORE?.has(s)||(console.groupCollapsed(`${n}> %c${s}%c on %c${t}`,T(i||j),"",T("#1a80cc")),console.log(e),e.target&&console.log(e.target),console.groupEnd())}var u={};function f(t,e){if(!t)throw new Error(e)}function H(t){f(typeof t=="string","The name should be a string"),f(!!u[t],`The component of the given name is not registered: ${t}`)}function C(t,e){f(typeof e=="string"&&!!e,"Component name must be a non-empty string"),f(!u[e],`The component of the given name is already registered: ${e}`);let n=`${e}-\u{1F48A}`,i=s=>{if(!s.classList.contains(n)){let d=o=>{s.addEventListener(`__unmount__:${e}`,o,{once:!0})};s.classList.add(e),s.classList.add(n),d(()=>s.classList.remove(n));let p=t({el:s,on:(o,r,a,c)=>{if(typeof r=="function"?(c=r,r=void 0,a=void 0):typeof a=="function"&&typeof r=="string"?(c=a,a=void 0):typeof a=="function"&&typeof r=="object"&&(c=a,a=r,r=void 0),typeof c!="function")throw new Error(`Cannot add event listener: The handler must be a function, but ${typeof c} is given`);O(e,s,o,c,r,a)},onOutside:(o,r)=>{S(o),w(r);let a=c=>{s!==c.target&&!s.contains(c.target)&&(y({module:"outside",color:"#39cccc",e:c,component:e}),r(c))};document.addEventListener(o,a),d(()=>document.removeEventListener(o,a))},onUnmount:d,query:o=>s.querySelector(o),queryAll:o=>s.querySelectorAll(o),subscribe:(o,r)=>{d(o.subscribe(r))}});typeof p=="string"?s.innerHTML=p:p&&typeof p.then=="function"&&p.then(o=>{typeof o=="string"&&(s.innerHTML=o)})}};i.sel=`.${e}:not(.${n})`,u[e]=i,globalThis.document&&(document.readyState==="complete"?g():_().then(()=>{g(e)}))}function w(t){f(typeof t=="function",`Cannot add an event listener: The event handler must be a function, ${typeof t} (${t}) is given`)}function S(t){f(typeof t=="string",`Cannot add an event listener: The event type must be a string, ${typeof t} (${t}) is given`)}function O(t,e,n,i,s,d){S(n),w(i);let m=l=>{(!s||[].some.call(e.querySelectorAll(s),v=>v===l.target||v.contains(l.target)))&&(y({module:"\u{1F48A}",color:"#e0407b",e:l,component:t}),i(l))};e.addEventListener(`__unmount__:${t}`,()=>{e.removeEventListener(n,m,d)},{once:!0}),e.addEventListener(n,m,d)}function g(t,e){let n;t?(H(t),n=[t]):n=Object.keys(u),n.map(i=>{[].map.call((e||document).querySelectorAll(u[i].sel),u[i])})}async function E(t){let e=await fetch(t);if(!e.ok)throw new Error(`${e.status} ${e.statusText}`);return e.json()}function h(t){return String(t??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function x(t){return t instanceof Error?t.message:String(t)}async function M(t){t.innerHTML='<div class="loading">Loading...</div>';try{let[e,n]=await Promise.all([E("/api/projects"),E("/api/sessions")]);t.innerHTML=`
      <div class="list-layout">
        <aside class="sidebar">
          <h3>Projects (${e.length})</h3>
        </aside>
        <section class="session-list">
          <div class="session-list-header">
            <h2>Sessions (${n.length})</h2>
          </div>
          <div class="empty-state">List UI coming in step 5.3</div>
        </section>
      </div>
    `}catch(e){t.innerHTML=`<div class="error">Failed to load: ${h(x(e))}</div>`}}async function A(t,e){t.innerHTML='<div class="loading">Loading...</div>';try{let n=await E(`/api/sessions/${encodeURIComponent(e)}`),i=n.meta??{};t.innerHTML=`
      <div class="detail-layout">
        <div class="detail-header">
          <h1>${h(i.sessionId??e)}</h1>
          <div class="detail-header-meta">
            ${i.cwd?`<span>${h(i.cwd)}</span>`:""}
            ${i.gitBranch?`<span class="branch">${h(i.gitBranch)}</span>`:""}
            <span>${n.events?.length??0} events</span>
          </div>
        </div>
        <div class="empty-state">Timeline UI coming in step 5.4</div>
      </div>
    `}catch(n){t.innerHTML=`<div class="error">Failed to load session: ${h(x(n))}</div>`}}function b(t){let e=location.pathname;if(e==="/"||e===""){M(t);return}let n=e.match(/^\/sessions\/([^/]+)$/);if(n){A(t,decodeURIComponent(n[1]));return}t.innerHTML='<div class="error">404 Not Found</div>'}function U(t,e){e!==location.pathname&&(history.pushState({},"",e),b(t))}function k({el:t}){document.addEventListener("click",e=>{let i=e.target?.closest("a[data-link]");if(!i)return;let s=i.getAttribute("href");!s||s.startsWith("http")||(e.preventDefault(),U(t,s))}),globalThis.addEventListener("popstate",()=>b(t)),b(t)}C(k,"app");g();
/*! Cell v0.7.9 | Copyright 2022-2024 Yoshiya Hinosawa and Capsule contributors | MIT license */
