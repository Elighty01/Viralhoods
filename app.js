const CATS=["World","Politics","Finance","Health","Entertainment","Research","Science","AI","Tech","Sports"];
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const cur=()=>decodeURIComponent(location.hash.slice(1))||"All";
const ago=d=>{const m=(Date.now()-new Date(d))/6e4;return m<60?Math.max(1,~~m)+"m ago":m<1440?~~(m/60)+"h ago":~~(m/1440)+"d ago"};
const L=$("list");
const head=()=>{$("h").innerHTML=`<div class=w><div class=top><a class=logo href=index.html>Viralhoods</a><span class=mut>What the world is talking about</span></div><nav>${["All",...CATS].map(c=>`<a href="index.html#${c}"${L&&c==cur()?" class=on":""}>${c}</a>`).join("")}</nav></div>`};
$("f").innerHTML=`<div class=w><b>Viralhoods</b><a href=about.html>About</a><a href=admin.html>Admin</a>${["YouTube","X","Instagram","Facebook","TikTok","Podcast"].map(s=>`<a href="#">${s}</a>`).join("")}<p>Viralhoods shares short summaries and links to the original publishers. Credit goes to the original sources.</p></div>`;
head();
if(L){let D=[];
const card=(x,big)=>{const h=CATS.indexOf(x.category)*36,t=big?2:3,
im=x.image?`<img class=im loading=lazy alt="" src="${esc(x.image)}" onerror="this.remove()">`:`<div class=im style="background:linear-gradient(135deg,hsl(${h} 80% 60%),hsl(${h+50} 80% 45%))"></div>`;
return `<a class="${big?"lead":"it"}" style="--h:${h}" href="${esc(x.url)}" target=_blank rel=noopener>${im}<div class=b><span class=cat>${esc(x.category)}</span><h${t}>${esc(x.title)}</h${t}><p>${esc(x.summary)}</p><span class=meta><span>${esc(x.source)}</span><span>${ago(x.date)}</span></span></div></a>`};
const draw=()=>{head();const c=cur(),q=$("q").value.toLowerCase(),
r=D.filter(x=>(c=="All"||x.category==c)&&(x.title+" "+x.summary).toLowerCase().includes(q));
L.innerHTML=r.length?card(r[0],1)+`<div class=grid>${r.slice(1).map(x=>card(x)).join("")}</div>`:"<p class=mut>No stories match. Try another sector or search, or run the news bot from the Admin page.</p>"};
fetch("data/news.json?t="+Date.now()).then(r=>r.json()).then(j=>{D=j.items||[];$("u").textContent=j.updated?"Updated "+ago(j.updated):"";draw()}).catch(()=>{L.innerHTML="<p class=mut>Stories could not load. Check that data/news.json exists, then refresh.</p>"});
addEventListener("hashchange",draw);$("q").oninput=draw}
