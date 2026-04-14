var n=document.getElementById("app");async function a(e){let t=await fetch(e);if(!t.ok)throw new Error(`${t.status} ${t.statusText}`);return t.json()}function i(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}function o(){n.innerHTML='<div class="loading">Loading...</div>'}function c(e){n.innerHTML=`<div class="error">${i(e)}</div>`}async function d(){o();try{let[e,t]=await Promise.all([a("/api/projects"),a("/api/sessions")]);n.innerHTML=`
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
    `}catch(e){c(`Failed to load: ${e.message}`)}}async function l(e){o();try{let t=await a(`/api/sessions/${encodeURIComponent(e)}`),s=t.meta??{};n.innerHTML=`
      <div class="detail-layout">
        <div class="detail-header">
          <h1>${i(s.sessionId??e)}</h1>
          <div class="detail-header-meta">
            ${s.cwd?`<span>${i(s.cwd)}</span>`:""}
            ${s.gitBranch?`<span class="branch">${i(s.gitBranch)}</span>`:""}
            <span>${t.events?.length??0} events</span>
          </div>
        </div>
        <div class="empty-state">Timeline UI coming in step 5.4</div>
      </div>
    `}catch(t){c(`Failed to load session: ${t.message}`)}}function p(e){if(e==="/"||e==="")return{name:"list"};let t=e.match(/^\/sessions\/([^/]+)$/);return t?{name:"detail",sessionId:decodeURIComponent(t[1])}:{name:"notfound"}}function r(){let e=p(location.pathname);e.name==="list"?d():e.name==="detail"?l(e.sessionId):n.innerHTML='<div class="error">404 Not Found</div>'}function u(e){e!==location.pathname&&(history.pushState({},"",e),r())}document.addEventListener("click",e=>{let t=e.target.closest("a[data-link]");if(!t)return;let s=t.getAttribute("href");!s||s.startsWith("http")||(e.preventDefault(),u(s))});globalThis.addEventListener("popstate",r);r();
