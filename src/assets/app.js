var s=document.getElementById("app");if(!s)throw new Error("#app element not found");async function r(e){let t=await fetch(e);if(!t.ok)throw new Error(`${t.status} ${t.statusText}`);return t.json()}function i(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function c(e){return e instanceof Error?e.message:String(e)}function d(){s.innerHTML='<div class="loading">Loading...</div>'}function l(e){s.innerHTML=`<div class="error">${i(e)}</div>`}async function p(){d();try{let[e,t]=await Promise.all([r("/api/projects"),r("/api/sessions")]);s.innerHTML=`
      <div class="list-layout">
        <aside class="sidebar">
          <h3>Projects (${e.length})</h3>
        </aside>
        <section class="session-list">
          <div class="session-list-header">
            <h2>Sessions (${t.length})</h2>
          </div>
          <div class="empty-state">List UI coming in step 5.3</div>
        </section>
      </div>
    `}catch(e){l(`Failed to load: ${c(e)}`)}}async function u(e){d();try{let t=await r(`/api/sessions/${encodeURIComponent(e)}`),n=t.meta??{};s.innerHTML=`
      <div class="detail-layout">
        <div class="detail-header">
          <h1>${i(n.sessionId??e)}</h1>
          <div class="detail-header-meta">
            ${n.cwd?`<span>${i(n.cwd)}</span>`:""}
            ${n.gitBranch?`<span class="branch">${i(n.gitBranch)}</span>`:""}
            <span>${t.events?.length??0} events</span>
          </div>
        </div>
        <div class="empty-state">Timeline UI coming in step 5.4</div>
      </div>
    `}catch(t){l(`Failed to load session: ${c(t)}`)}}function h(e){if(e==="/"||e==="")return{name:"list"};let t=e.match(/^\/sessions\/([^/]+)$/);return t?{name:"detail",sessionId:decodeURIComponent(t[1])}:{name:"notfound"}}function o(){let e=h(location.pathname);e.name==="list"?p():e.name==="detail"?u(e.sessionId):s.innerHTML='<div class="error">404 Not Found</div>'}function g(e){e!==location.pathname&&(history.pushState({},"",e),o())}document.addEventListener("click",e=>{let n=e.target?.closest("a[data-link]");if(!n)return;let a=n.getAttribute("href");!a||a.startsWith("http")||(e.preventDefault(),g(a))});globalThis.addEventListener("popstate",o);o();
